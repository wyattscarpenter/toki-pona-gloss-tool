var getCategory;
var getMessage;
var rulesByCategory;

function parseLipuLinku(data) {
    return Object.keys(data.data).map(function(word) {
        return [word, data.data[word].usage_category];
    });
}

function build_rules(wordList) {
    let commonWords = wordList
        .filter((pair) => {
            return ['common', 'core', 'widespread'].indexOf(pair[1]) != -1;
        })
        .map((pair) => pair[0]);
    let uncommonWords = wordList
        .filter((pair) => {
            return ['common', 'core', 'widespread'].indexOf(pair[1]) == -1;
        })
        .map((pair) => pair[0]);

    let allWords = commonWords.concat(uncommonWords);

    // \x02 is the ASCII char:       002   2     02    STX (start of text)
    // Full sentence: includes all the `X la, Y la, ... Z`
    // Partial sentence: includes only one la/main-block
    let PARTIAL_SENTENCE_BEGIN = /(([\x02:;.!?“”]\s*(taso,)?|\W{3,})\s*|\bla\b[,\s]*|\bo\b[,\s]*)/.source;
    let FULL_SENTENCE_BEGIN = /(([\x02;.!?“”]|\W{3,})\s*)/.source;
    let PARTICLES = 'en|li|e|la|pi|o|anu';
    let PREPOSITIONS = 'lon|tawa|tan|sama|kepeken';
    let PROPER_NOUNS = "((Jan|Jen|Jon|Jun|Kan|Ken|Kin|Kon|Kun|Lan|Len|Lin|Lon|Lun|Man|Men|Min|Mon|Mun|Nan|Nen|Nin|Non|Nun|Pan|Pen|Pin|Pon|Pun|San|Sen|Sin|Son|Sun|Tan|Ten|Ton|Tun|Wan|Wen|Win|An|En|In|On|Un|Ja|Je|Jo|Ju|Ka|Ke|Ki|Ko|Ku|La|Le|Li|Lo|Lu|Ma|Me|Mi|Mo|Mu|Na|Ne|Ni|No|Nu|Pa|Pe|Pi|Po|Pu|Sa|Se|Si|So|Su|Ta|Te|To|Tu|Wa|We|Wi|A|E|I|O|U)(jan|jen|jon|jun|kan|ken|kin|kon|kun|lan|len|lin|lon|lun|man|men|min|mon|mun|nan|nen|nin|non|nun|pan|pen|pin|pon|pun|san|sen|sin|son|sun|tan|ten|ton|tun|wan|wen|win|ja|je|jo|ju|ka|ke|ki|ko|ku|la|le|li|lo|lu|ma|me|mi|mo|mu|na|ne|ni|no|nu|pa|pe|pi|po|pu|sa|se|si|so|su|ta|te|to|tu|wa|we|wi)*)";

    let endsWithPartialSentenceBegin = new RegExp('(' + PARTIAL_SENTENCE_BEGIN + ')$');
    let endsWithFullSentenceBegin = new RegExp('(' + FULL_SENTENCE_BEGIN + ')$');
    let startsWithFullSentenceBegin = new RegExp('^(' + FULL_SENTENCE_BEGIN + ')');

    function startOfPartialSentence(match, behind) {
        return behind.match(endsWithPartialSentenceBegin);
    }

    function startOfFullSentence(match, behind) {
        return behind.match(endsWithFullSentenceBegin) || match[0].match(startsWithFullSentenceBegin);
    }

    function normalizePartialSentence(sentence) {
        // Remove possibly matched words from beginning of sentence
        return sentence.replace(/^o,/, '')
                       .replace(/[^\w ]/g, ' ')
                       .replace(/\s+/g, ' ')
                       .trim()
                       .replace(/(^la\s+|^taso\s+)/g, '');
    }

    function Err(rule, message, category) {
        this.raw_rule = rule;

        if(typeof(rule[0]) === "undefined") {
            this.rule = new RegExp('^(' + rule.source + ')');
        } else {
            this.rule = [
                new RegExp('^(' + rule[0].source + ')'),
                rule[1]
            ];
        }
        this._regex = typeof(rule[0]) === "undefined" ? this.rule : this.rule[0];

        this.getMatch = function(line) {
            return line.match(this._regex.source);
        }

        this.message = message;
        this.category = category;
    }

    var rules = {
        // Non pu grammar
        tasoJoinsSentences: new Err(
            /,\s*taso\b/,
            "<em>taso</em> can't join two sentences.",
            'error'
        ),
        noLiAfterMiSina: new Err(
            [
                /(mi|sina)\s+li\b/,
                startOfPartialSentence,
            ],
            '<em>$1</em> used with <em>li</em>.',
            'error'
        ),
        duplicateParticle: new Err(
            new RegExp(
                PARTICLES.split('|').concat(['ni']).map(function(x) {
                    return '\\b' + x + '\\s+' + x + '\\b';
                }).join('|')
            ),
            "This word shouldn't appear twice.",
            'error'
        ),
        duplicatePronoun: new Err(
            new RegExp(
                ['mi', 'sina', 'ona'].map(function(x) {
                    return '\\b' + x + '\\s+' + x + '\\b';
                }).join('|')
            ),
            function(m) {
                if(m[0] == 'mi mi')
                    return "This word probably shouldn't appear twice, unless you really meant <em>\"I am me\"</em> or <em>\"my me\"</em>.";
                else if(m[0] == 'sina sina')
                    return "This word probably shouldn't appear twice, unless you really meant <em>\"You are you\"</em> or <em>\"your you\"</em>.";
                else
                    return "This word probably shouldn't appear twice, unless you really meant <em>\"They are them\"</em> or <em>\"their them\"</em>.";
            },
            'suspicious'
        ),
        illFormedQuestion: new Err(
            [
                /[^;.!“”]+?\?/,
                function(m, behind) {
                    if(!startOfFullSentence(m, behind)) return false;

                    // No question word found
                    return !m[0].match(/\banu\b/) &&
                           !m[0].match(/\bseme\b/) &&
                           !m[0].match(/\b(.+)\s+ala\s+\1\b/);
                },
            ],
            'Ill-formed question.\n\nYou should use either the form <em>"[verb] ala [verb]</em>, the form <em>"X, anu seme?"</em> or at least include either of the words <em>anu</em> or <em>seme</em>.',
            'warning'
        ),
        dontCapitalizeSentences: new Err(
            [
                new RegExp('\\b(' +
                           allWords.map((x) => x[0].toUpperCase() + x.slice(1))
                                   .join('|') + ')\\b'),
                function(m, b) {
                    return startOfFullSentence(m, b);
                },
            ],
            'Sentences should not start with a capital letter.',
            'error'
        ),
        objectWithoutVerb: new Err(
            [
                new RegExp(
                    '(' + PARTIAL_SENTENCE_BEGIN + /([^.!?;:]+?)/.source + '(' + PARTIAL_SENTENCE_BEGIN + ')' + ')'
                ),
                function(m, behind) {
                    let cleanSentence = normalizePartialSentence(m[0]);

                    return !cleanSentence.match(/\b(li|o)\b/) &&
                           (!cleanSentence.match(/^mi\s/i) || cleanSentence.match(/^mi\s+e\b/i)) &&
                           (!cleanSentence.match(/^sina\s/i) || cleanSentence.match(/^sina\s+e\b/i)) &&
                           cleanSentence.match(/\be\b/);
                },
            ],
            "Object without a verb. Did you forget a <em>li</em> somewhere?",
            'error'
        ),

        // Weird/suspicious constructs that might be valid in rare cases
        piSuspicious: new Err(
            new RegExp('(\\bpi\\s+[a-zA-Z]+(\\s+(li|e|pi|en|la|anu|o)\\b|(' + PARTIAL_SENTENCE_BEGIN + ')))'),
            'Suspicious usage of <em>pi</em> here, pi should usually be followed by at least two words.',
            'suspicious'
        ),
        liPi: new Err(
            /\bli\s+pi\b/,
            'Are you sure about that <em>li pi</em>?\n\nThis would mean <em>"is owned by"</em> and is not very common.',
            'suspicious'
        ),
        consecutiveParticles: new Err(
            [
                new RegExp('\\b(' + PARTICLES + ')\\s+(' + PARTICLES + ')\\b'),
                function(m, behind) {
                    return !(m[2] == 'la' && m[3] == 'o') &&
		                   !(m[2] == 'anu' && ['li', 'e', 'o'].indexOf(m[3]) != -1);
                }
            ],
            "Those two particles should not follow each other.",
            'error'
        ),
        weirdActionVerb: new Err(
            /\b(mi|sina|li|o)\s+(lon|sama|tan)(\s+(ala|kin))?\s+e\b/,
            function(m) {

                if(m[3] == 'sama') {
                    return 'Double check: <em>sama</em> as an action verbe (<em>sama e X</em>) is uncommon.\n\n' +
                           'This would mean <em>"to imitate X"</em>. ' +
                           'The prepositional form <em>"sama X"</em> (<em>"like X"</em>, <em>"same as X"</em>) is much more common.';
                } else if(m[3] == 'lon') {
                    return 'Double check: <em>lon</em> as an action verbe (<em>lon e X</em>) is uncommon.\n\n' +
                           'This would mean <em>"to make X </em>real/aware/awake/conscious". ' +
                           'The prepositional form <em>"lon X"</em> (<em>"at/in/on X"</em>) is much more common.';
                } else if(m[3] == 'tan') {
                    return 'Double check: <em>tan</em> as an action verbe (<em>tan e X</em>) is uncommon.\n\n' +
                           'This would mean <em>"to cause X"</em>. ' +
                           'The prepositional form <em>"tan X"</em> (<em>"because of X"</em>, <em>"from X"</em>) is much more common.';
                } else {
                    return 'Double check: <em>$2</em> as an action verbe (<em>$2 e X</em>) is uncommon.';
                }
            },
            'suspicious'
        ),
        suspiciousTawa: new Err(
            [
                /\b(li|o|mi|sina)\s+tawa(\s+(ala|kin))?\s+e\s+(tomo|ma|mun|nasin|lupa)\b/,
                function(m, behind) {

                    if(m[0].match(/^(mi|sina)\s/) && !startOfPartialSentence(m, behind))
                        return false;
                    return true;
                }
            ],
            'Double check: <em>tawa</em> as an action verbe is suspicious with this object.\n\nThis would mean <em>"to move/displace X"</em>. The prepositional form <em>"tawa X"</em> is much more common (<em>"going to X"</em>, <em>"in the direction of X"</em>).\n\nDid you mean <em>tawa $4</em>?',
            'suspicious'
        ),
        suspiciousEn: new Err(
            [
                /(\b(li|o)\b|((mi|sina)))\s+[^:;.!?,]+\s+\ben\b/,
                function(m, behind) {

                    if(m[0].match(/^(mi|sina)\s/) && !startOfPartialSentence(m, behind))
                        return false;

                    let cleanSentence = normalizePartialSentence(m[0]);
                    // `li ... la ... en` might be correct
                    // TODO: li x pi y en z might be accepted by some people
                    return !cleanSentence.match(/\bla\b/);
                }
            ],
            '<em>en</em> is a subject separator, it is not equivalent to the english word <em>and</em>.\n\nFor multiple verbs or multiple objects, use multiple <em>li</em> or multiple <em>e</em> instead.',
            'suspicious'
        ),
        suspiciousKepeken: new Err(
            /\bkepeken\s+(meli|mije|tonsi|jan)\b/,
            "Suspicious use of <em>kepeken</em> here.\n\n<em>kepeken Person</em> means <em>\"using Person\"</em>, not <em>\"with Person\"</em>. If you meant <em>\"with Person\"</em> in the sense of <em>\"alongside Person\"</em>, you can use something such as <em>\"lon poka People\"</em>. You could also rephrase it as <em>\"X en Person li ...\"</em>",
            'suspicious'
        ),
        unofficialWordWithoutNoun: new Err(
            [
                new RegExp(PARTIAL_SENTENCE_BEGIN + '([^:;.!?,]+(\\b(' + PARTICLES + '|lon|tawa|tan|kepeken)\\b)\\s+|(mi|sina)\\s+)?(' + PROPER_NOUNS + '[a-z]*)'),
                (function() {
                    let matchesKnownWord = new RegExp('^\\b(' + allWords.join('|') + ')\\b$');
                    return function(m, behind) {
                        let cleanSentence = normalizePartialSentence(m[0]);

                        // XXX: Avoid matching uselessly capitalized toki pona words
                        if(startOfFullSentence(m, behind)) {
                            let matchedNoun = m[m.length - 3].toLowerCase();

                            if(matchedNoun.match(matchesKnownWord)) {
                                return false;
                            }
                        }
                        
                        // `li ... la ... en` might be correct
                        return !cleanSentence.match(/\bla\b/) &&
                               // One common exception to the "noun Foreign" rule : "nimi [...] li Xyz"
                               !cleanSentence.match(/^nimi/);
                    };
                })()
            ],
            "Possible use of unofficial word without a preceding noun.\n\nMake sure your proper noun is preceded by an official word (eg.: <em>\"ona li Sonja\"</em>  would be <em>\"ona li jan Sonja\"</em>).",
            'suspicious'
        ),
        // Things that are accepted but could be better written
        sinaO: new Err(
            [
                /sina\s+o\b/,
                startOfPartialSentence
            ],
            '<em>sina</em> can be omitted with <em>o</em>.',
            'warning',
        ),
        piNanpa: new Err(
            /\bpi\s+nanpa\s+((wan|tu|luka|mute|ale|ali)\s+)*(wan|tu|luka|mute|ale|ali)/,
            '<em>pi</em> can be omitted with <em>nanpa</em> as an ordinal marker.',
            'warning'
        ),
        multiplePi: new Err(
            [
                /\bpi\s+([^:;.!?,]+)\s+pi\b/,
                (function() {
                    let regex = new RegExp('\\b(' + PARTICLES + '|' + PREPOSITIONS + ')\\b');
                    return function(m) {
                        return !m[m.length - 1].match(regex);
                    };
                })(),
            ],
            'Multiple <em>pi</em> can lead to ambiguous phrases, consider if all possible meanings are roughly equivalent or if the meaning is clear enough in this context.',
            'warning'
        ),

        unsubFromHalfAsInteresting: new Err(
            /\b(poki\s+loje\s+lon\s+sinpin\s+li\s+poki\s+tawa|suwi\s+telo\s+wawa\s+kepeken\s+namako\s+en\s+kule\s+ijo\s+kasi)\b/,
            "Please unsub from Half As Interesting.",
            'error'
        ),

        // Not an error, must match this before trying to match a nimiPuAla
        commonWords: new Err(
            new RegExp('\\b((' + commonWords.join('|') + ')|' + /((Jan|Jen|Jon|Jun|Kan|Ken|Kin|Kon|Kun|Lan|Len|Lin|Lon|Lun|Man|Men|Min|Mon|Mun|Nan|Nen|Nin|Non|Nun|Pan|Pen|Pin|Pon|Pun|San|Sen|Sin|Son|Sun|Tan|Ten|Ton|Tun|Wan|Wen|Win|An|En|In|On|Un|Ja|Je|Jo|Ju|Ka|Ke|Ki|Ko|Ku|La|Le|Li|Lo|Lu|Ma|Me|Mi|Mo|Mu|Na|Ne|Ni|No|Nu|Pa|Pe|Pi|Po|Pu|Sa|Se|Si|So|Su|Ta|Te|To|Tu|Wa|We|Wi|A|E|I|O|U)(jan|jen|jon|jun|kan|ken|kin|kon|kun|lan|len|lin|lon|lun|man|men|min|mon|mun|nan|nen|nin|non|nun|pan|pen|pin|pon|pun|san|sen|sin|son|sun|tan|ten|ton|tun|wan|wen|win|ja|je|jo|ju|ka|ke|ki|ko|ku|la|le|li|lo|lu|ma|me|mi|mo|mu|na|ne|ni|no|nu|pa|pe|pi|po|pu|sa|se|si|so|su|ta|te|to|tu|wa|we|wi)*)/.source + ')\\b'),
            '', false),

        // Not an error either, but small warning
        uncommonWord: new Err(
            new RegExp('\\b(' + uncommonWords.join('|') + ')\\b'),
            'Uncommon word, make sure your target audience knows it.',
            'uncommon'
        ),
        
        nimiSuliPuAla: new Err(
            /\b([A-Z][a-zA-Z]*)\b/,
            'Proper noun with unauthorized syllables.',
            'warning'
        ),
        nimiPuAla: new Err(
            /\b([a-zA-Z]+)\b/,
            'Unknown word.',
            'error'
        ),
        startOfText: new Err(
            /\x02/, '', false
        ),

        punctuation: new Err(/[^a-zA-Z]/, '', false),
        ignore: new Err(/./, '', false),

        wat: new Err(/^$/),
    };

    rulesByCategory = {};

    Object.keys(rules).forEach(function(key) {
        let category = rules[key].category

        if(!category) return;

        if(!(category in rulesByCategory))
            rulesByCategory[category] = [];

        rulesByCategory[category].push(key);
    });

    getCategory = function(key) {
        if(!(key in rules))
            return false;

        return rules[key].category;
    };

    getMessage = function(key, text) {
        if(!(key in rules))
            return false;

        let match = rules[key].getMatch(text);
        let message = rules[key].message;

        if(typeof(message) == 'function') {
            message = message(match);
        }

        for(var i=1; i<match.length; i++) {
            message = message.replaceAll('$'+(i-1), match[i]);
        }

        return message;
    };

    return rules;
};

if(typeof(module) != 'undefined') {
    module.exports = {
        build_rules: build_rules,
        parseLipuLinku: parseLipuLinku,
    };
}
