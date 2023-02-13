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
        .map((pair) => {
            return pair[0] == 'n'
                 ? 'n+' // Match nnnnn...
                 : pair[0]
        });
    let uncommonWords = wordList
        .filter((pair) => {
            return ['common', 'core', 'widespread'].indexOf(pair[1]) == -1;
        })
        .map((pair) => pair[0]);

    /* Force 'ali' (nimi pu) to be in common words... This seems to
       have fallen out of usage, but it feels wrong to exclude pu
       words from the commonWords category */
    commonWords = commonWords.concat('ali');
    uncommonWords = uncommonWords.filter((x) => x != 'ali');

    let allWords = commonWords.concat(uncommonWords);

    // Yeah, it's basically just the word "Pingo"
    let jokeWordsThatStartWithACapitalLetter = allWords.filter((x) => x.match(/^[A-Z]/));

    let matchesKnownWord = new RegExp('^\\b(' + allWords.join('|') + ')\\b$');

    // \x02 is the ASCII char:       002   2     02    STX (start of text)
    // Full sentence: includes all the `X la, Y la, ... Z`
    // Partial sentence: includes only one la/main-block
    let FULL_SENTENCE_BEGIN = /(([\x02;.…!?“”]|\W{3,})\s*)/.source;
    let PARTIAL_SENTENCE_BEGIN = /(([\x02:;.!?“”]\s*(taso,?|a\b,?)?|\W{3,})\s*|[,\s]*\bla\b[,\s]*|\btaso,|,\s*taso\b|\bo,\s)/.source;
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
                       .replace(/^(la|taso|a)\s+/g, '') // Required multiple times to strip multiple particles
                       .replace(/^(la|taso|a)\s+/g, '')
                       .replace(/^(la|taso|a)\s+/g, '');
    }

    function Err(rule, message, category, more_infos) {
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
        this.more_infos = more_infos;
    }

    var rules = {

        nimiPuAla: new Err(
            [
                new RegExp(PARTIAL_SENTENCE_BEGIN + '?' + /(\b([a-z]+)\b)/.source),
                function(m, behind) {
                    return !m[m.length-1].match(matchesKnownWord);
                },
            ],
            'Unknown word.',
            'error',
            'https://linku.la/'
        ),
        noLiAfterMiSina: new Err(
            [
                /(mi|sina)\s+li\b/,
                startOfPartialSentence,
            ],
            '<em>$1</em> used with <em>li</em>.',
            'error',
            'https://github.com/kilipan/nasin-toki#the-particle-li'
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
                if(m[0].indexOf('mi') == 0)
                    return "This word probably shouldn't appear twice, unless you really meant <em>\"I am me\"</em> or <em>\"my me\"</em>.";
                else if(m[0].indexOf('sina') == 0)
                    return "This word probably shouldn't appear twice, unless you really meant <em>\"You are you\"</em> or <em>\"your you\"</em>.";
                else
                    return "This word probably shouldn't appear twice, unless you really meant <em>\"They are them\"</em> or <em>\"their them\"</em>.";
            },
            'suspicious'
        ),
        illFormedQuestion: new Err(
            [
                /[^;.!“”]+?\?[\!\?]*/,
                function(m, behind) {

                    // Avoid matching "????" as an ill-formed question
                    if(!m[0].match(/[a-z-A-Z]/)) return false;

                    if(!startOfFullSentence(m, behind)) return false;

                    // No question word found
                    return !m[0].match(/\banu\b/) &&
                           !m[0].match(/\bseme\b/) &&
                           !m[0].match(/\b(.+)\s+ala\s+\1\b/);
                },
            ],
            'Ill-formed question.\n\nYou should use either the form <em>"[verb] ala [verb]</em>, the form <em>"X, anu seme?"</em> or at least include either of the words <em>anu</em> or <em>seme</em>.',
            'warning',
            'https://github.com/kilipan/nasin-toki#questions'
        ),
        alaMultipleWords: new Err(
            [
                /\b((\w+\s+)+\w+)\s+ala\s+\2\b/,
                function(m, behind) {
                    let isParticle = new RegExp('^(' + PARTICLES + ')$');

                    // Particles aren't matched as part of that
                    return m[0].split(/[^a-z]/).filter(function(x) {
                        return x.match(isParticle);
                    }).length == 0;
                }
            ],
            'In <em>X ala X</em> questions, the repeated part is typically only one word.\n\nFor multi word phrases, repeat only the head (<em>sina moku ala moku mute?</em>)\nWhen your question contains a preverb, repeat only the preverb (<em>sina ken ala ken pali?</em>)',
            'warning',
            'https://github.com/kilipan/nasin-toki#x-ala-x'
        ),
        dontCapitalizeSentences: new Err(
            [
                new RegExp(PARTIAL_SENTENCE_BEGIN + '?' +
                           '\\b(' +
                           allWords.map((x) => {
                               // Special case for nnnnnnnn...
                               return x == 'n+'
                                    ? 'Nn*'
                                    : x[0].toUpperCase() + x.slice(1)
                           }).join('|') + ')\\b'),
                function(m, b) {
                    return startOfFullSentence(m, b) &&
                           jokeWordsThatStartWithACapitalLetter.indexOf(m[m.length-1]) === -1;
                },
            ],
            'Sentences should not start with a capital letter.',
            'error'
        ),
        putingEAfterWordDoesntGerundizeIt: new Err(
            [
                new RegExp(
                    '(' + PARTIAL_SENTENCE_BEGIN + /([^.!?;:]+?)/.source + '\\b(li|o)\\b' + ')'
                ),
                function(m, behind) {
                    let cleanSentence = normalizePartialSentence(m[0]);

                    return !cleanSentence.match(new RegExp(PARTIAL_SENTENCE_BEGIN)) &&
                           (!cleanSentence.match(/^mi\s/i) || cleanSentence.match(/^mi\s+e\b/i)) &&
                           (!cleanSentence.match(/^sina\s/i) || cleanSentence.match(/^sina\s+e\b/i)) &&
                           !cleanSentence.match(/^o.+o$/) &&
                           cleanSentence.match(/\be\b/);
                },
            ],
            "<em>e</em> is a particle that introduces the direct object of a verb. You can't use it inside a subject.\n\n" +
            "Sometimes, removing the <em>e</em> is sufficient. e.g. <em>\"moku e kala li pona\"</em> (ill-formed <em>\"eating a fish is good\"</em>) can be expressed as <em>\"moku kala li pona\"</em> (<em>\"fish-eating is good\"</em>).",
            'error',
            'https://www.youtube.com/watch?v=ywRsfMZjp8Q&t=1701s'
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
            'error',
        ),
        objectWithoutVerbMiSinaEn: new Err(
            [
                new RegExp(
                    '(' + PARTIAL_SENTENCE_BEGIN + /([^.!?;:]+?)/.source + '(' + PARTIAL_SENTENCE_BEGIN + ')' + ')'
                ),
                function(m, behind) {
                    let cleanSentence = normalizePartialSentence(m[0]);

                    return cleanSentence.match(/^(mi|sina)\s+[\s\S]*\ben\b[\s\S]+\be\b/i) &&
                           !cleanSentence.match(/\b(li|o)\b/);
                },
            ],
            "A <em>li</em> is required unless the subject is exactly and only <em>mi</em> or exactly and only <em>sina</em>.\n\n" +
            'e.g. <em>"mi en sina li moku"</em> is prefered over <em>"mi en sina moku"</em>',
            'warning',
            'https://github.com/kilipan/nasin-toki#the-particle-li'
        ),
        piOneWord: new Err(
            new RegExp('(\\bpi\\s+[a-zA-Z]+(\\s+(li|e|en|la|anu|o)\\b|(' + PARTIAL_SENTENCE_BEGIN + ')))'),
            '<em>pi</em> does not mean "of". As a general rule, pi should be followed by at least two words.',
            'error',
            'https://github.com/kilipan/nasin-toki#the-particle-pi-1'
        ),
        piXpi: new Err(
            new RegExp('\\bpi\\s+[a-zA-Z]+\\s+pi\\s+[a-zA-Z]+\\s+[a-zA-Z]+\\b'),
            'Suspicious usage of <em>pi</em> here. <em>pi</em> should usually be followed by at least two modifiers.\n\n' +
            'If you\'re trying to use a compound word (<em>"X pi Y Z"</em>) to form a second compound (<em>"W pi X pi Y Z"</em>), know that this is an unpopular way of doing things. Consider breaking your complex word into multiple simpler sentences.',
            'suspicious',
            'https://github.com/kilipan/nasin-toki#the-particle-pi-1'
        ),
        liPi: new Err(
            /\bli\s+pi\b/,
            "Those two particles should not follow each other.\n\nIf you saw that in an old toki pona course, know that it might have been in use at some point in the past, but it's not in use anymore.",
            'error'
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
                    return 'Double check: <em>sama</em> as an action verb (<em>sama e X</em>) is uncommon.\n\n' +
                           'This would mean <em>"to imitate X"</em>. ' +
                           'The prepositional form <em>"sama X"</em> (<em>"like X"</em>, <em>"same as X"</em>) is much more common.';
                } else if(m[3] == 'lon') {
                    return 'Double check: <em>lon</em> as an action verb (<em>lon e X</em>) is uncommon.\n\n' +
                           'This would mean <em>"to make X </em>real/aware/awake/conscious". ' +
                           'The prepositional form <em>"lon X"</em> (<em>"at/in/on X"</em>) is much more common.';
                } else if(m[3] == 'tan') {
                    return 'Double check: <em>tan</em> as an action verb (<em>tan e X</em>) is uncommon.\n\n' +
                           'This would mean <em>"to cause X"</em>. ' +
                           'The prepositional form <em>"tan X"</em> (<em>"because of X"</em>, <em>"from X"</em>) is much more common.';
                } else {
                    return 'Double check: <em>$2</em> as an action verb (<em>$2 e X</em>) is uncommon.';
                }
            },
            'suspicious',
            'https://en.wikibooks.org/wiki/Updated_jan_Pije%27s_lessons/Lesson_6_Prepositions_1_lon,_kepeken,_and_tawa'
        ),
        suspiciousTawa: new Err(
            [
                /\b(li|o|mi|sina)\s+tawa(\s+(ala|kin))?\s+e\s+(tomo|ma|mun|nasin|lupa|sewi)\b/,
                function(m, behind) {
                    return !(m[0].match(/^(mi|sina)\s/) && !startOfPartialSentence(m, behind));
                }
            ],
            'Double check: <em>tawa</em> as an action verb is suspicious with this object.\n\nThis would mean <em>"to move/displace X"</em>. The prepositional form <em>"tawa X"</em> is much more common (<em>"going to X"</em>, <em>"in the direction of X"</em>) with this object.\n\nDid you mean <em>tawa $4</em>?',
            'suspicious',
            'https://en.wikibooks.org/wiki/Updated_jan_Pije%27s_lessons/Lesson_6_Prepositions_1_lon,_kepeken,_and_tawa'
        ),
        badPreposition: new Err(
            [
                /\b(li|o|mi|sina)\s+(insa|poka)\b/,
                function(m, behind) {
                    return !(m[0].match(/^(mi|sina)\s/) && !startOfPartialSentence(m, behind))
                }
            ],
            function(m) {
                if(m[3] == 'insa') {
                    return 'Double check: <em>insa</em> as a predicate is suspicious. In most cases, it would mean something such as "<em>is the inside</em> of X".\n\n' +
                           'If you meant "is inside of X", you probably should use "lon insa X".';
                } else {
                    return 'Double check: <em>poka</em> as a predicate is suspicious. It would mean something such as "<em>is the side</em> of".\n\n' +
                           'If you meant "is beside/nearby X", you probably should use "lon poka X".';
                }
            },
            'suspicious',
            'https://en.wikibooks.org/wiki/Updated_jan_Pije%27s_lessons/Lesson_7_Prepositions_2_Other_prepositions'
        ),
        suspiciousEn: new Err(
            new RegExp('(' + /(\b(li|o|e)\b)\s+[^:;.!?,]+\s+\ben\b/.source + '.+?)' + PARTIAL_SENTENCE_BEGIN),
            '<em>en</em> is a subject separator, it is not equivalent to the english word <em>and</em>.\n\nFor multiple verbs or multiple objects, use multiple <em>li</em>, multiple <em>e</em> or multiple prepositions instead.',
            'suspicious',
            'https://github.com/kilipan/nasin-toki#the-particle-en'
        ),
        suspiciousKepeken: new Err(
            /\bkepeken\s+(meli|mije|tonsi|jan)\b/,
            "Suspicious use of <em>kepeken</em> here.\n\n<em>kepeken Person</em> means <em>\"using Person\"</em>, not <em>\"with Person\"</em>. If you meant <em>\"with Person\"</em> in the sense of <em>\"alongside Person\"</em>, you can use something such as <em>\"lon poka Person\"</em>. You could also rephrase it as <em>\"X en Person li ...\"</em>",
            'suspicious',
            'https://www.reddit.com/r/tokipona/comments/zwhun3/comment/j1usd44/'
        ),
        unofficialWordWithoutNoun: new Err(
            [
                new RegExp('(' + PARTIAL_SENTENCE_BEGIN + '([^:;.!?,]+(\\b(' +
                           'en|e|la|pi|o|anu' + // "x li Proper Noun" is a common construct
                           '|lon|tawa|tan|kepeken)\\b)\\s+|(mi|sina)\\s+)?)(' + PROPER_NOUNS + '[a-z]*)'),
                function(m, behind) {
                    let cleanSentence = normalizePartialSentence(m[0]);

                    if(jokeWordsThatStartWithACapitalLetter.indexOf(m[10]) !== -1)
                        return false;

                    // Avoid matching uselessly capitalized toki pona words at the
                    // start of a sentence, another category of error matches
                    // that case
                    if(startOfFullSentence("foo", behind + m[2])) {
                        let matchedNoun = m[m.length - 4].toLowerCase();

                        if(matchedNoun.match(matchesKnownWord)) {
                            return false;
                        }
                    }

                    // `li ... la ... en` might be correct
                    return !cleanSentence.match(/\bla\b/);
                }
            ],
            "Possible use of unofficial word without a preceding noun.\n\nProper nouns are usually treated as adjectives for toki pona words. Make sure your proper noun is preceded by an official word.\n\n" +
            "e.g. <em>\"mi tan Kanata\"</em> should instead be <em>\"mi tan ma Kanata\"</em>. <em>\"mi Sonja\"</em> should probably be <em>\"mi jan Sonja\"</em>",
            'suspicious',
            'https://en.wikibooks.org/wiki/Updated_jan_Pije%27s_lessons/Lesson_9_Gender,_Unofficial_Words,_Commands'
        ),
        sinaO: new Err(
            [
                /sina\s+o\b[^,]/,
                function(m, behind) {
                    return startOfPartialSentence(m, behind) && !m[0].match(endsWithFullSentenceBegin);
                }
            ],
            '<em>sina</em> can be omitted with <em>o</em>.',
            'warning',
            'https://github.com/kilipan/nasin-toki#the-particle-o'
        ),
        oBeforeAdress: new Err(
            /\bo\s+(meli|mije|tonsi|jan|sina)\b/,
            "<em>o Person</em> is a command/wish to <em>personify</em> something. " +
            "If you meant to address someone, the <em>o</em> particle goes after.\n\n" +
            'e.g. <em>"o jan Lakuse!"</em> should be <em>"jan Lakuse o!"</em>',
            'suspicious',
            'https://www.youtube.com/watch?v=ywRsfMZjp8Q&t=1627s',
        ),
        piNanpa: new Err(
            /\bpi\s+nanpa\s+((wan|tu|luka|mute|ale|ali)\s+)*(wan|tu|luka|mute|ale|ali)/,
            '<em>pi</em> can be omitted with <em>nanpa</em> as an ordinal marker.',
            'warning',
            'https://github.com/kilipan/nasin-toki#ordinals'
        ),
        multiplePi: new Err(
            [
                /\bpi\s+([^:;.!?,]+?)\s+pi\b/,
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
        longSentence: new Err(
            [
                new RegExp('((' + FULL_SENTENCE_BEGIN + ')' + /([^.!?;]+?)/.source + '(' + FULL_SENTENCE_BEGIN + ')' + ')'),
                function(m, behind) {
                    return m[0].split(/[^a-z]+/).length > 30;
                },
            ],
            'Consider breaking long sentences into multiple smaller sentences. Small and simple is better than long and complex. From <em>lipu pu</em>:\n\n<em>"Simplify your thoughts. Less is more."</em>',
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
            'uncommon',
            'https://linku.la/'
        ),

        // This rule matches words when the 'uncommon' category is disabled
        uncommonWordOk: new Err(
            new RegExp('\\b(' + uncommonWords.join('|') + ')\\b'),
            '', false
        ),

        nimiSuliPuAla: new Err(
            /\b([A-Z][a-zA-Z]*)\b/,
            'Proper noun with unauthorized syllables.',
            'warning',
            'https://www.reddit.com/r/tokipona/comments/e09ebn/sona_kalama_pi_toki_pona_table_of_usedpermitted/'
        ),

        // This rule matches proper nouns when the 'warning' category is disabled
        properNounsOk: new Err(
            /\b([A-Z][a-zA-Z]*)\b/,
            '', false
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

    getMessage = function(key, match) {
        if(!(key in rules))
            return false;

        let err = rules[key]
        let message = err.message;

        if(typeof(message) == 'function') {
            message = message(match);
        }

        for(var i=1; i<match.length; i++) {
            message = message.replace(new RegExp('\\$'+(i-1), 'g'), match[i]);
        }

        if(err.more_infos) {
            message += '<br><a  class="more-infos" target="_blank" href="' + err.more_infos + '">[Learn more]</a>';
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
