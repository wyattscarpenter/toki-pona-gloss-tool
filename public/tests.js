let rulesFunctions = require('./rules.js');
let ParserWithCallbacks = require('./Parser.js').ParserWithCallbacks;
let build_rules = rulesFunctions.build_rules;
let parseLipuLinku = rulesFunctions.parseLipuLinku;

var fs = require("fs");
var file_content = fs.readFileSync('linku.json');
var data = JSON.parse(file_content);

let words = parseLipuLinku(data);

let rules = build_rules(words);


let parser = new ParserWithCallbacks(rules);
let tok = parser.tokenize('mi moku.');


let tests = {
    noLiAfterMiSina: {
        'mi li pona mute a': 1,
        'sina li pona mute a': 1,
        'sina li pona mute la, mi li pona ala': 2,
        'jan pona mi li pona mute a': 0,
        'jan pona sina li pona mute a': 0,
        'toki sina li ike la, sina lipu li ike': 0,
    },
    duplicateParticle: {
        'jan li li pona a': 1,
        'mi taso li pona e e ijo': 1,
        'mi taso li pona e e ijo, li li pona e ale': 2,
        'mi anu anu sina li pona?': 1,
        'ni li pona mute mute mute': 0,
    },
    duplicatePronoun: {
        'mi mi moku': 1,
        'mi mi olin olin mute mute e sina sina': 2,
        'mi moku la, mi moku mute': 0,
    },
    illFormedQuestion: {
        'mi wile moku?': 1,
        'mi wile moku? ni li lon?': 2,
        'sina wile moku ala wile?': 1,
        'sime wile ala wile muke e ijo?': 0,
        'jan li moku seme la, jan li pilin ike?': 0,
        'mi moku': 0,
        'mi moku ala moku?': 0,
        'mi moku ala moku pona mute?': 0,

        'o lukin e sewi. o seme e sina: soweli wan li moku ala moku e kasi loje??': 0,
    },
    alaMultipleWords: {
        'sina moku mute ala moku mute?': 1,
        'sina wile moku mute ala moku mute?': 1,
        'sina wile kama moku mute ala wile kama moku mute?': 1,
        'jan li wile toki ala wile toki tawa mi?': 1,
        'jan li wile ala li wile ala mute toki tawa mi': 0,
        'jan o pona ala pona e ni?': 0,
        'mi ken ala ken pakala e ni?': 0,
    },
    objectWithoutVerb: {
        'jan moku e pan': 1,
        'jan moku e pan la, mi pilin pona': 1,
        'mi pilin e pona': 0,
        'jan li moku e pan la, jan moku kin e pan': 1,
        'jan o moku e pan la, jan moku kin e pan': 1,
        'jan li moku e pan la, jan o moku kin e pan': 0,

        'mi e pan': 1,
        'sina e pan': 1,
        'jan e pan': 1,

        'tenpo ni la, mi wile pona e tomo tawa kon la, mi sitelen ike e ni': 0,
        'mi wile ala e ijo la taso mi jo e ijo': 0,
    },
    objectWithoutVerbMiSinaEn: {
        "sina en mi kama moku e pan": 1,
        "mi en mi kama moku e pan": 1,
        "mi en jan kama moku e pan": 1,
        "mi mute en sina kama moku e pan": 1,
        "sina en jan kama moku e pan": 1,

        "lipu ni la mi wile pana e sona pi pakala suli. mi wile e ni: sina ken pona e pakala suli. taso, ona li pana ala e sona luka pi nasin pona.": 0,

        'mi la mi mute en jan ante li moku ala e ni': 0,
        'mi la mi mute en jan ante li moku ala e ni la, mi pona a': 0,
        'mi en sina en jan ante li pali e ni: ijo pona a': 0,
        'jan Wa en jan Pe en jan Se li kama pona tawa mi': 0,
        'mi en jan Wa en jan Pe en jan Se li kama pona tawa mi': 0,
    },
    onaMissingLi: {
        'ona moku': 1,
        'ona toki ala': 1,
        'ona ken ala toki': 1,
        'ona lon ma Kanata': 1,

        // This should be caught by `objectWithoutVerb`
        'ona ken ala toki e ni': 0,

        'ni li lon: ona!': 0,
        'ona la, ni li pona moku': 0,
    },
    puttingEAfterWordDoesntGerundizeIt: {
        'moku e kala li pona': 1,
        'mama e jan lili li pali suli!': 1,
        'moku e soweli li ike tawa mi :(': 1,

        'o awen ala, o pona e mi, o toki e ni tawa mi: jan lawa lili li kama tu…': 0,
        'o pana e pona tawa mi, o toki lawa e ni tawa suno: o weka': 0,

        'mi la, moku li ike, taso moku e kala li pona': 1,
        'mi la, moku li ike taso, moku e kala li pona': 1,

        'tenpo sama la sina ken ala jo e pan suwi li ken ala moku kin e ona': 0,

        'a, mi sona e ijo sin': 0,

        'o moku e pan li wile ala e ni': 0,
    },
    piOneWord: {
        'jan toki pi pona li musi mute': 1,
        'jan pi pi toki pona li musi mute': 0,
        'mi pi toki li lon': 1,
    },
    piXpi: {
        'mi sona e nasin pi ilo pi nimi pona': 1,
        'nasin pi ilo pi nimi pona li pona tawa mi': 1,
    },
    liPi: {
        'jan ni li pi mi': 1,
        'lipu li pi jan sama sina': 1,
    },
    consecutiveParticles: {
        'jan li e pan': 1,
        'jan li pona anu ike': 0,
        'jan li pona anu li ike': 0,
        'jan li moku e pan': 0,
        'jan li moku e pan anu e telo': 0,

        'jan o e pan': 1,
        'jan o moku e pan': 0,
        'jan o moku e pan anu o moku e telo': 0,
        'jan li moku pi e pan.': 1,
        'jan li moku pi pona mute e pan.': 0,
        'jan li moku pi anu pona': 1,
        'jan li moku anu pi pona': 1,
        'jan anu mi en sina li moki': 0,
    },
    weirdActionVerb: {
        'soweli li lon e supa noka': 1,
        'mi lon e supa noka': 1,
        'o lon e supa noka': 1,

        'tomo sina li sama e tomo mi': 1,
        'jan li sama e mi': 1,
        'mi sama e ni': 1,

        'mi tan e ma Kanse': 1,
        'jan li tan e ma Inli': 1,
        'o tan e ma Inli': 1,
        'ni li tan e ni: mi moku': 1,
    },
    suspiciousTawa: {
        'mi tawa e tomo mi': 1,
        'mi tawa ala e tomo mi': 1,
        'mi tawa kin e tomo mi': 1,
        'jan tawa li tawa e tomo sina la, ona li lon tomo sina': 1,
        'mi tawa ala e tomo sina!': 1,
        'mi o tawa ala e tomo sina!': 1,
        'mi o tawa e tomo sina!': 1,
    },
    badPreposition: {
        'mi poka sina': 1,
        'mi insa tomo': 1,
        'ona li insa tomo': 1,
        'o insa tomo mi': 1,
        'o poka tomo mi': 1,
        'mi o poka tomo mi': 1,
        'ona li tomo insa': 0,
        'mi lon poka sina': 0,
    },
    lukinPona: {
        'sina lukin pona': 1,
        'mi jo e len pona la mi lukin pona': 1,
        'jan li olin la ona li lukin pona mute': 1,
        'jan o lukin pona. ni li pona tawa mi': 0,
        'oko mi li wile e ilo pi lukin pona': 0,
        'mi wile lukin e mun la, mi wile e ilo lukin pona': 0,
        'sina alasa la o lukin pona': 0,
        'jan li lukin pona e ijo la, ijo li lon': 0,
    },
    lukinSama: {
        'mi lukin sama sina': 1,
        'ona li lukin sama ijo ante': 1,
        'supa pi lukin sama li pona tawa mi': 0,
        'jan o lukin sama pipi': 1,
        'lukin sama la mi ken lukin e ijo ike kin': 0,
    },
    modifyingPreverb: {
        'mi wile mute moku': 1,
        'mi ken mute moku': 1,
        'mi kama mute moku': 1,

        'mi wile mute mute la ijo li pona': 0,
        'mi wile mute e ni': 0,
        'mi ken lili lili': 0,
        'mi wile mute ala': 0,
        'mi wile mute kin': 0,
        'mi wile mute taso': 0,
        'mi wile mute a a a': 0,
        'mi ken lili lili a a a': 0,

        'mi wile mute miku': 0,

        'mi sona lili pali': 1,
        'mi awen lili lape': 1,
        'mi lukin lili moku': 1,
        'mi alasa lili pali': 1,
        'mi open mute moku': 1,
        'mi pini lili moku': 1,

        'mi jan lili pona': 0,
        'ni li palisa lili kiwen': 0,
        'ni li ike mute mute': 0,

        'ona li wile mute tawa': 1,
        'ona li kama lili lon ni': 0,
        'ona li wile mute kepeken wile ale ona': 0,
        'ona li wile mute tawa e ni': 1,
        'jan li wile mute kepeken e ilo wawa': 1,

        'jan li wile mute moku tawa ni: moku li pona': 1,
        'moku la, jan li wile mute tawa ni: moku li pona': 0,

        'mi wile taso moku': 1,
        'mi ken taso sitelen': 1,
        'mi sona taso pali e ni': 1,

        'jan li awen taso pali e ni': 1,
        'o awen taso lape': 1,

        'mi wile taso lili e ni': 0,
        'mi wile taso mute e ni': 0,

        'mi sona taso pali li ike tawa mi': 0,
        'mi sona taso pali suli mute li ike tawa mi': 0,
    },
    suspiciousEn: {
        'mi en sina li lon': 0,
        'mi en jan pona mi li moku': 0,

        'jan pona li moku en musi': 1,
        'jan mi li moku en musi': 1,
        'sina en mi li moku en musi': 1,
        'o moku mi en musi': 1,
        'jan li moku e pan en sike mama': 1,

        'mi la mi mute en jan ante li moku ala e ni': 0,
        'mi la mi mute en jan ante li moku ala e ni la, mi pona a': 0,
        'mi en sina en jan ante li pali e ni: ijo pona a': 0,
        'jan Wa en jan Pe en jan Se li kama pona tawa mi': 0,
        'mi en jan Wa en jan Pe en jan Se li kama pona tawa mi': 0,
        'telo li pona la ma en sewi li nasa a': 0,

        'lipu sina li pakala en ike la, ilo mi li ken pona e ona': 1,
        'lipu mi en lipu sina li pakala en ike la, ilo mi li ken pona e ona': 1,
    },
    suspiciousKepeken: {
        'tenpo pi suno tu tu la ona li musi kepeken meli': 1,
        'mi pali e ilo mi kepeken jan pona mi': 1,
        'mi pali e ilo mi kepeken ilo mi': 0,
    },
    unofficialWordWithoutNoun: {
        'mi lon Inli': 1,
        'mi toki e Inli': 1,
        'mi Nikola': 1,
        'mi tan Kanse': 1,
        'mi kepeken Siko': 1,

        'jan li lon Inli': 1,
        'jan li toki e Inli': 1,
        'jan li Nikola': 0,
        'jan li tan Kanse': 1,
        'jan li kepeken Siko': 1,
        'jan o lon Inli': 1,
        'jan o toki e Inli': 1,
        'jan o Nikola': 1,
        'jan o tan Kanse': 1,
        'jan o kepeken Siko': 1,

        'mi lon ma Inli': 0,
        'mi toki e toki Inli': 0,
        'mi toki Inli': 0,
        'mi jan Nikola': 0,
        'mi tan ma Kanse': 0,
        'mi kepeken ilo Siko': 0,

        'jan li lon ma Inli': 0,
        'jan li toki e toki Inli': 0,
        'jan li toki Inli': 0,
        'jan li jan Nikola': 0,
        'jan li tan ma Kanse': 0,
        'jan li kepeken ilo Siko': 0,
        'jan o lon ma Inli': 0,
        'jan o toki e toki Inli': 0,
        'jan o toki Inli': 0,
        'jan o jan Nikola': 0,
        'jan o tan ma Kanse': 0,
        'jan o kepeken ilo Siko': 0,

        'nimi pona mi li Nikola': 0,

        'mi Wawa': 1,
        'mi jan Wawa': 0,
        'jan li pona Moku mute la, ona li pona': 0,
        'jan Mali li jan utala. Ona li pilin pona tan ni. Mi pilin pona kin.': 0,

        'jan Napoko li sitelen e lipu Lolita anu Uli?': 0,

        // The Pingo-exception
        'mi tawa kepeken Pingo mi': 0,
        'Pingo mi li lon Pingo suli ante': 0,
    },
    sinaO: {
        'sina o moku pona': 1,
        'jan sina o moku pona': 0,
        'mi o moku pona': 0,
        'sina o!': 0,
        'sina o, mi moku pona': 0,
    },
    oBeforeAdress: {
        'o jan Lakuse!': 1,
        'o jan! sina pona!': 1,
        'o jan pali Mawijo! sina pona!': 1,
        'o tonsi Po, pona e lipu mi': 1,

        'tonsi Po o! pona e lipu mi': 0,
        'tonsi Po o pona e lipu mi': 0,
        'tonsi Po o! o pona e lipu mi': 0,

        'o pana e pona tawa mi, o toki lawa e ni tawa suno: o weka!': 0,
    },
    piNanpa: {
        'mi jan pi nanpa wan': 1,
        'mi jan pi nanpa mute luka tu wan': 1,
        'mi nanpa wan': 0,
        'nanpa mi pi moku pona li wan': 0,
        'nanpa pi moku pona mi li wan': 0,
    },
    multiplePi: {
        'jan pi moku pona pi musi mute li nasa': 1,
        'jan li moku la, ona li jan pi moku pona la, ona li jan pi musi mute li nasa': 0,
    },
    longSentence: {
        'tenpo ale la, sina anu jan pona sina pi toki pona anu jan ante li wile kepeken e ilo pona mi pi nasin pona la, o kepeken e ona lon tenpo pi wile sina a': 1,
        'jan li moku la, ona li jan pi moku pona la, ona li jan pi musi mute li nasa': 0,
    },
    unsubFromHalfAsInteresting: {
        'poki  loje  lon  sinpin  li  poki \n tawa': 1,
        'suwi  telo wawa kepeken namako en kule ijo kasi': 1,
        'jan Tapoki  loje  lon  sinpin  li  poki \n tawa': 0,
    },
    dontCapitalizeSentences: {
        'Jan ale li sona e ni: mi pona': 1,
        'Jan ale li pona. Mi pona': 2,
        'Mi la, mi pilin pona a': 1,
        'Nnnnnnnnnnn...': 1,

        // The Pingo-exception
        'Pingo mi li wawa': 0,
    },
    nimiSuliPuAla: {
        'mi pali e ilo mi kepeken jan pona mi. jan pona mi li jan Kijom, li pona kin e ilo mi': 1,
        'lon ilo Discord la, mi jan John': 2,
    },
    uncommonWord: {
        'jan ki toki li toki pona a!': 1,
    },
    nimiPuAla: {
        'toki! mi jan Nikola, li kama pana e lukin pi ilo ni tawa sini': 1,
        'this is not toki pona': 3,
        'mi toki lawa la, mi toki e ni: nnnnnnnnnnnnnnnnnnnnnnn': 0,
        'mi toki lawa la, mi toki e ni: n': 0,
    },
};


let nanpaPalaka = 0;

for(let ruleName in tests) {
    for(let sentence in tests[ruleName]) {
        let expectedCount = tests[ruleName][sentence];

        // Just show the first error of a given sentence, not every
        // possible variation
        let skip = false;

        // Add various contexts before/after the test
        // The context shouldn't change the outcome
        ['',
         'lon. ', 'ni la, ni li lon. ',
         'mi la, ', 'jan pona mi la ',
         'tenpo pi mi lili la ',
         'taso, ', 'taso ',
         'ni li pona: ', 'jan o, '].forEach(function(prefix) {
             if(skip) return;

             ['', '.', '·', '!', '...', '…',
              '; mi moku', '. ni la, mi moku a!',
              '. taso, mi wile ala e ni: mi moku.',
              '. ni li pona: ',
              '. jan o, mi wile ala e ni: ale li ike...'].forEach(function(suffix) {

                  if(skip) return;

                  // Don't try funky things with question marks
                  if(sentence.slice(-1) == '?' && suffix != '') return;

                  // This rule tests the start of a sentence, don't mess with the start
                  if(ruleName == 'dontCapitalizeSentences' && prefix != '') return;

                  let testSentence = prefix + sentence + suffix;
                  let tokens = parser.tokenize(testSentence);

                  let matches = tokens.filter(function(el) {
                      return el.ruleName == ruleName;
                  });

                  if(matches.length != expectedCount) {
                      nanpaPalaka++;
                      console.log(
                          ruleName + ':', testSentence,
                          'found:', matches.length,
                          'expected:', expectedCount);
                      skip = true;
                  }
              });
         });
    }
}

// -- Coverage --
for(let key in rules) {
    if(rules[key].category)
        if(!(key in tests)) {
            nanpaPalaka++;
            console.log('Untested rule:', key);
        }
}

let example = `jan o, toki! :-)

mi jan Nikola, li kama
pana e lukin pi ilo ni tawa sini.

mi pona, taso, toki mi li ken pi ike.
pona la, mi li jo e ilo ni a!
mi pali e ilo mi kepeken jan pona mi. jan pona
mi li jan Kijom, li pona kin e ilo mi.

Mi pana e ilo ni tawa sina kepeken linluwi :) kulijo a!
mi jo e ilo ni la, jan li lon e tomo mi la, mi ken toki pona tawa ona.
ni la, ilo ni li pali e ni: mi sama e jan sona a!
mi tan e ma Kepeke. jan li tawa e tomo mi la, mi pilin pona.

sina o kepeken ilo mi! ni li ilo pi nanpa wan :-)
jan pi nasin nasa pi toki ike li sona ala e ilo mi.
mi wile e ni: ilo mi pona e toki pi jan ale.
ni li pi pona mute a!

ilo ni li lukin sama ilo https://languagetool.org/.
ni li ilo pi nimi pona. ona li lukin pona.
nasin pi ilo pi nimi pona li ni: pakala li insa toki sina la, o alasa e ona!

o jan, lipu sina li pakala en ike la, ilo mi li ken pona e ona.
ni la, ona kama pona!

mi en sina ken lukin e ilo mi. mi wile pona e lipu mi en lipu sina ;)
sina wile kepeken ilo mi? pona a!

sina wile toki tawa mi lon Siko lon ma pona la, sina sina ken mute mute. ilo Siko la, mi Nikola.
jan ale li li ken toki tawa mi. jan li o toki tawa mi a! toki e mi li pona tawa mi.
sina wile toki ala wile toki tawa mi? jan li wile mute toki tawa mi la jan li ken.

tenpo ale la, sina anu jan pona sina pi toki pona anu jan ante li wile kepeken
e ilo pona mi pi nasin pona la, o kepeken ona lon tenpo pi wile sina a!

poki  loje  lon  sinpin  li  poki tawa`;


let tokens = parser.tokenize(example);
let names = {};
tokens.map((x) => x.ruleName).forEach((x) => {
    names[x] = 1;
});

Object.keys(tests).forEach((ruleName) => {
    if(!(ruleName in names)) {
        console.log(ruleName, 'not found in the sample text');
        nanpaPalaka++;
    }
});


if(nanpaPalaka) {
    console.log(nanpaPalaka, 'errors');
    process.exit(-1);
}
