Numbas.queueScript('base',[],function() {});
Numbas.queueScript('go',['json','jme','localisation','parts/numberentry','parts/jme','parts/matrixentry', 'parts/multipleresponse', 'parts/patternmatch','parts/gapfill','question'],function() {
    let jme = Numbas.jme;
    let math = Numbas.math;

    var createPartFromJSON = function(data){ return Numbas.createPartFromJSON(data, 'p0', null, null); };

    function mark_part(p, answer, scope) {
        var answer = answer;
        scope = scope || p.getScope();
        p.storeAnswer(answer);
        p.setStudentAnswer();
        return p.mark(scope);
    }

    function matrix(cells) {
        cells.rows = cells.length;
        cells.columns = cells[0].length;
        return cells;
    }

    function contains_note(res, note) {
        var match = res.states.find(function(s){
            return Object.entries(note).every(function(d) {
                return s[d[0]] == d[1];
            });
        });
        return match!==undefined;
    }

    QUnit.module('Part')
    QUnit.test('Set marks', function(assert) {
        var p = createPartFromJSON({type:'numberentry', marks: 3, minValue: '1', maxValue: '2'});
        assert.equal(p.marks,3,'3 marks');
    });

    QUnit.module('Custom marking JavaScript');
    QUnit.test('set credit to 1', function(assert) {
        var data = {"type":"numberentry","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{"mark":{"script":"this.setCredit(1,\"Top marks!\");\nthis.answered = true;","order":"instead"}},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1","maxValue":"1","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"};

        var p = createPartFromJSON(data);

        var res = mark_part(p,'1');
        assert.ok(p.answered,'Part is answerd');
        assert.equal(p.credit,1,'1 credit');
        assert.equal(p.markingFeedback[0].message,'Top marks!', 'Feedback message is "Top marks!" as set in script');
    });

    QUnit.module('Stateful scope');
    QUnit.test('nested calls in a stateful scope retain scope', function(assert) {
        var scope = new Numbas.marking.StatefulScope(Numbas.jme.builtinScope);
        scope.evaluate('feedback("Hi");try(correctif(x),y,1);2');
        assert.equal(scope.state.length,1,"Feedback message is not lost when try evaluates the catch clause");
    });

    QUnit.module('Number entry');
    QUnit.test('Answer is 1', function(assert) {
        var p = createPartFromJSON({type:'numberentry', marks: 1, minValue: '1', maxValue: '1'});
        var res;
        res = mark_part(p, '1');
        assert.equal(res.credit,1,'"1" marked correct');

        res = mark_part(p, '0');
        assert.equal(res.credit,0,'"0" marked incorrect');

        res = mark_part(p, '!');
        assert.equal(res.credit,0,'"!" marked incorrect');
        assert.notOk(res.valid,'"!" is invalid');
    });
    QUnit.test('Partial credit for wrong precision', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '0.1', maxValue: '0.1', precision: '2', precisionType: 'dp', precisionPartialCredit: 20});
        var res = mark_part(p,'0.1000');
        assert.equal(res.credit,0.2,'"0.1000" gets partial credit');
    });
    QUnit.test('Answer is 1/3, fractions not allowed', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1/3', maxValue: '1/3'});
        var res = mark_part(p,'1/3');
        assert.equal(res.credit,0,'"1/3": No credit awarded');
        assert.notOk(res.valid,'"1/3": Not valid');
    });
    QUnit.test('Answer is 1/3, fractions allowed', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1/3', maxValue: '1/3', allowFractions: true});
        var res = mark_part(p,'1/3');
        assert.equal(res.credit,1,'"1/3" correct');
    });
    QUnit.test('Answer is 1/3, fraction must be reduced', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1/3', maxValue: '1/3', allowFractions: true, mustBeReduced: true, mustBeReducedPC: 0.5});
        var res = mark_part(p,'1/3');
        assert.equal(res.credit,1,'"1/3" correct');
        var res = mark_part(p,'2/6');
        assert.equal(res.credit,0.5,'"2/6" gets penalty');
        assert.ok(contains_note(res,{note:'cancelled',factor:0.5,op:'multiply_credit'}));
    });
    QUnit.test('Answer is 1/3, to 2 dp', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1/3', maxValue: '1/3', precision: '2', precisionType: 'dp'});
        var res = mark_part(p,'0.33');
        assert.equal(res.credit,1,'"0.33" correct');
        var res = mark_part(p,'0.330');
        assert.equal(res.credit,0,'"0.330" incorrect');
    });
    QUnit.test('Answer is 0.1, to 2 dp', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '0.1', maxValue: '0.1', precision: '2', precisionType: 'dp'});
        var res = mark_part(p,'0.1');
        assert.equal(res.credit,1,'"0.1" correct');
        var res = mark_part(p,'0.10');
        assert.equal(res.credit,1,'"0.10" correct');
        var res = mark_part(p,'0.100');
        assert.equal(res.credit,0,'"0.100" incorrect');
    });
    QUnit.test('Answer is 0.1, to 2 dp, strict', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '0.1', maxValue: '0.1', precision: '2', precisionType: 'dp', strictPrecision: true});
        var res = mark_part(p,'0.1');
        assert.equal(res.credit,0,'"0.1" incorrect');
    });
    QUnit.test('Answer is 1.22, to 1 dp, strict', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1.22', maxValue: '1.22', precision: '1', precisionType: 'dp', strictPrecision: true, precisionPartialCredit: 50});
        var res = mark_part(p,'1.20');
        assert.equal(res.credit,0,'"1.20" incorrect');
        var res = mark_part(p,'1.22');
        assert.equal(res.credit,0.5,'"1.22" correct but penalty');
        assert.ok(contains_note(res,{note:'correctprecision',factor:0.5,op:'multiply_credit'}));
        var res = mark_part(p,'1.2');
        assert.equal(res.credit,1,'"1.2" correct');
    });
    QUnit.test('Answer is 1.27, to 1 dp, strict', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1.27', maxValue: '1.27', precision: '1', precisionType: 'dp', strictPrecision: true, precisionPartialCredit: 50});
        var res = mark_part(p,'1.27');
        assert.equal(res.credit,0.5,'"1.27" correct but penalty');
        assert.ok(contains_note(res,{note:'correctprecision',factor:0.5,op:'multiply_credit'}));
        var res = mark_part(p,'1.3');
        assert.equal(res.credit,1,'"1.3" correct');
    });
    QUnit.test('Answer is 1.27, to 2 sf, strict', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1.27', maxValue: '1.27', precision: '2', precisionType: 'sigfig', strictPrecision: true, precisionPartialCredit: 50});
        var res = mark_part(p,'1.27');
        assert.equal(res.credit,0.5,'"1.27" correct but penalty');
        assert.ok(contains_note(res,{note:'correctprecision',factor:0.5,op:'multiply_credit'}));
        var res = mark_part(p,'1.3');
        assert.equal(res.credit,1,'"1.3" correct');
    });
    QUnit.test('Answer is 12700, to 2 sf, strict', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '12700', maxValue: '12700', precision: '2', precisionType: 'sigfig', strictPrecision: true, precisionPartialCredit: 50});
        var res = mark_part(p,'12700');
        assert.equal(res.credit,0.5,'"12700" correct but penalty');
        assert.ok(contains_note(res,{note:'correctprecision',factor:0.5,op:'multiply_credit'}));
        var res = mark_part(p,'13000');
        assert.equal(res.credit,1,'"13000" correct');
    });

    QUnit.test('Don\'t mark infinity correct', function(assert) {
        var p = createPartFromJSON({"type":"numberentry","useCustomName":false,"customName":"","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","adaptiveMarkingPenalty":0,"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1","maxValue":"1","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"});
        var res = mark_part(p,'1');
        assert.equal(res.credit,1,'"1" is correct');
        var res = mark_part(p,'infinity');
        assert.equal(res.credit,0,'"infinity" is incorrect');
    });

    QUnit.module('JME')
    QUnit.test('Answer is "x+2"', function(assert) {
        var p = createPartFromJSON({type:'jme', answer: 'x+2'});
        var res = mark_part(p,'x+2');
        assert.equal(res.credit,1,'"x+2" correct');
        var res = mark_part(p,'2+x');
        assert.equal(res.credit,1,'"2+x" correct');
        var res = mark_part(p,'2');
        assert.equal(res.credit,0,'"2" incorrect');
        var res = mark_part(p,'!');
        assert.notOk(res.valid,'"!" invalid');
        var res = mark_part(p,'');
        assert.notOk(res.valid,'"" invalid');
    });
    QUnit.test('Answer that can\'t be evaluated', function(assert) {
        var data = {"type":"jme","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"answer":"x^2+x","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":false,"expectedVariableNames":[],"musthave":{"strings":["("],"showStrings":false,"partialCredit":0,"message":"didn't use ("},"notallowed":{"strings":["^"],"showStrings":false,"partialCredit":0,"message":"did use ^"}};
        var p = createPartFromJSON(data);
        var res = mark_part(p,'x(x+1)');
        assert.notOk(res.valid,"x(x+1) not valid");
        var expectedFeedback = [{"op":"warning","message":"Your answer is not a valid mathematical expression.<br/>Function <code>x</code> is not defined. Is <code>x</code> a variable, and did you mean <code>x*(...)</code>?.","note":"agree"},{"op":"set_credit","credit":0,"message":"Your answer is not a valid mathematical expression.<br/>Function <code>x</code> is not defined. Is <code>x</code> a variable, and did you mean <code>x*(...)</code>?.","reason":"invalid","note":"agree"}];
        assert.deepEqual(res.states, expectedFeedback,"Warning message doesn't mention note name");
    });

    QUnit.test('Student doesn\'t use all the variables in the correct answer', function(assert) {
        var data = {
            "type": "jme",
            "useCustomName": false,
            "customName": "",
            "marks": 1,
            "showCorrectAnswer": true,
            "showFeedbackIcon": true,
            "scripts": {},
            "variableReplacements": [],
            "variableReplacementStrategy": "originalfirst",
            "adaptiveMarkingPenalty": 0,
            "customMarkingAlgorithm": "",
            "extendBaseMarkingAlgorithm": true,
            "unitTests": [],
            "prompt": "<p>$\\simplify[]{x + 0*y^t}$</p>",
            "answer": "x +  0*y^t",
            "answerSimplification": "basic",
            "showPreview": true,
            "checkingType": "absdiff",
            "checkingAccuracy": 0.001,
            "failureRate": 1,
            "vsetRangePoints": 5,
            "vsetRange": [
                0,
                1
            ],
            "checkVariableNames": false,
            "mustmatchpattern": {
                "pattern": "? + ?*?^?",
                "partialCredit": "50",
                "message": "Pattern",
                "nameToCompare": ""
            },
            "valuegenerators": [
                {
                    "name": "t",
                    "value": ""
                },
                {
                    "name": "x",
                    "value": ""
                },
                {
                    "name": "y",
                    "value": ""
                }
            ]
        };
        var p = createPartFromJSON(data);
        var res = mark_part(p,'x');
        assert.ok(res.valid,"x is valid");
        var expectedFeedback = [
            {
                "op": "set_credit",
                "credit": 1,
                "reason": "correct",
                "message": "Your answer is numerically correct.",
                "note": "numericallycorrect"
            },
            {
                "op": "multiply_credit",
                "factor": 0.5,
                "message": "Pattern",
                "note": "failmatchpattern"
            }
        ];
        assert.deepEqual(res.states, expectedFeedback,"x is marked correct");
    });

    QUnit.test('Variables defined by the question aren\'t used in evaluating student\'s expression', function(assert) {
        var data = {"name":"scope used when evaluating JME","tags":[],"metadata":{"description":"","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{"a":{"name":"a","group":"Ungrouped variables","definition":"[1,2,3]","description":"","templateType":"anything"}},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":["a"],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"jme","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Write $2a$</p>","answer":"2a","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":false,"expectedVariableNames":[]}]};
        var done = assert.async();

        var q = Numbas.createQuestionFromJSON(data, 0);
        q.generateVariables();
        q.signals.on('ready',function() {
            var p = q.getPart('p0');
            p.storeAnswer('2a');
            p.setStudentAnswer();
            q.submit();

            assert.equal(q.score,1,'Score is 1');

            done();
        });

    });

    QUnit.module('Pattern match');
    QUnit.test('Answer is "hi+"', function(assert) {
        var p = createPartFromJSON({type:'patternmatch', answer: 'hi+', displayAnswer: 'hi'});
        var res = mark_part(p,'hi');
        assert.equal(res.credit,1,'"hi" correct');
        var res = mark_part(p,'hiiiiii');
        assert.equal(res.credit,1,'"hiiiiii" correct');
        var res = mark_part(p,'h');
        assert.equal(res.credit,0,'"h" incorrect');
        var res = mark_part(p,'???');
        assert.equal(res.credit,0,'"???" incorrect');
        assert.ok(res.valid,'"???" valid');
    });

    QUnit.module('Matrix entry');
    QUnit.test('Answer is id(2)', function(assert) {
        var p = createPartFromJSON({type:'matrix', correctAnswer: 'id(2)'});
        var res = mark_part(p,matrix([['1','0'],['0','1']]));
        assert.equal(res.credit,1,'[[1,0],[0,1]] is correct');
        var res = mark_part(p,matrix([['1','1'],['0','1']]));
        assert.equal(res.credit,0,'[[1,1],[0,1]] is incorrect');
        var res = mark_part(p,matrix([['1','0','0'],['0','1','0'],['0','0','0']]));
        assert.equal(res.credit,0,'[[1,0,0],[0,1,0],[0,0,0]] is incorrect');
        assert.ok(res.states.filter(function(s){return s.note=='wrong_size' && s.credit==0}).length>0, '[[1,0,0],[0,1,0],[0,0,0]] fails because wrong size');
    });
    QUnit.test('Fractions', function(assert) {
        var p = createPartFromJSON({type:'matrix',correctAnswer:'id(2)/2', allowFractions: true});
        var res = mark_part(p,matrix([['1/2','0'],['0','1/2']]));
        assert.equal(res.credit,1,'fractions marked correct');
    });
    QUnit.test('Rounding', function(assert) {
        var p = createPartFromJSON({type:'matrix',correctAnswer:'matrix([1.222,1.227],[3,4])', allowFractions: true, precisionType: 'dp', precision: 2, precisionPartialCredit: 50});
        var res = mark_part(p,matrix([['1.22','1.23'],['3.00','4.00']]));
        assert.equal(res.credit,1,'[[1.22,1.23],[3.00,4.00]] correct');
        var res = mark_part(p,matrix([['1.222','1.227'],['3.000','4.000']]));
        assert.equal(res.credit,0.5,'[[1.222,1.227],[3.000,4.000]] partially correct');
        var res = mark_part(p,matrix([['1.222','1.227'],['3.00','4.00']]));
        assert.ok(contains_note(res,{note:'all_same_precision',message: R('part.matrix.not all cells same precision')}),'not all cells same precision warning');
    });

    QUnit.test('Note name used both for question variable and marking note',function(assert) {
        var data = {"name":"wrong size matrix","tags":[],"metadata":{"description":"","licence":"Creative Commons Attribution 4.0 International"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{"rows":{"name":"rows","group":"Ungrouped variables","definition":"4","description":"","templateType":"anything"}},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":["rows"],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"gapfill","marks":0,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"\n<p>[[0]]</p>","gaps":[{"type":"matrix","marks":"4","showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"correctAnswer":"matrix([1,0,3,3,1],[0,1,4,4,2],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0])","correctAnswerFractions":true,"numRows":"6","numColumns":"5","allowResize":true,"tolerance":0,"markPerCell":false,"allowFractions":true}],"sortAnswers":false}]};

        var done = assert.async();
        assert.expect(1);

        var q = Numbas.createQuestionFromJSON(data);
        q.generateVariables();
        var promise = q.signals.on('ready',function() {
            var g = q.getPart('p0g0');
            g.storeAnswer(matrix([['2','0'],['0','1']]));
            var p = q.getPart('p0');
            p.submit();
            assert.ok(p.answered,'can submit a smaller matrix than expected');
            done();
        }).catch(function(e) {
            console.log(e);
            done();
            throw(e);
        });

    });

    QUnit.module('Choose one from a list');
    QUnit.test('Three choices, first answer is correct', function(assert) {
        var p = createPartFromJSON({type:'1_n_2', choices: ['a','b','c'], matrix: [[1],[0],[0]]});
        var res = mark_part(p, [[true], [false], [false]]);
        assert.equal(res.credit,1,'Picking first choice is correct');
        var res = mark_part(p, [[false], [true], [false]]);
        assert.equal(res.credit,0,'Picking second choice is incorrect');
    })
    QUnit.test('Three choices, third answer is correct', function(assert) {
        var p = createPartFromJSON({type:'1_n_2', choices: ['a','b','c'], matrix: [[0],[0],[1]]});
        var res = mark_part(p, [[false], [false], [true]]);
        assert.equal(res.credit,1,'Picking third choice is correct');
        var res = mark_part(p, [[true], [false], [false]]);
        assert.equal(res.credit,0,'Picking first choice is incorrect');
    })
    QUnit.test('Three choices, first answer is correct, marking matrix is a JME expression', function(assert) {
        var p = createPartFromJSON({type:'1_n_2', choices: ['a','b','c'], matrix: '[1,0,0]'});
        var res = mark_part(p, [[true], [false], [false]]);
        assert.equal(res.credit,1,'Picking first choice is correct');
        var res = mark_part(p, [[false], [true], [false]]);
        assert.equal(res.credit,0,'Picking second choice is incorrect');
    })

    QUnit.module('Choose several from a list');
    QUnit.test('Two choices, both right', function(assert) {
        var p = createPartFromJSON({type:'m_n_2', choices: ['a','b'], matrix: [[1],[1]]});
        var res = mark_part(p, [[true], [true]]);
        assert.equal(res.credit,1,'Picking both is correct');
        var res = mark_part(p, [[true], [false]]);
        assert.equal(res.credit,0.5,'Picking just one gives half credit');
    });
    QUnit.test('Two choices, minAnswers = 2', function(assert) {
        var p = createPartFromJSON({type:'m_n_2', choices: ['a','b'], matrix: [[1],[1]], minAnswers: 2});
        var res = mark_part(p, [[false], [true]]);
        assert.equal(res.credit,0,'Picking one is incorrect');
    });

    QUnit.module('Match choices with answers');
    QUnit.test('Marking matrix is id(2)', function(assert) {
        var p = createPartFromJSON({type:'m_n_x', choices: ['a','b'], answers: ['A','B'], matrix: [[1,0],[0,1]]});
        var res = mark_part(p, [[true,false],[false,true]]);
        assert.equal(res.credit,1,'Picking correct options gives 1 credit');
        var res = mark_part(p, [[true,true],[true,true]]);
        assert.equal(res.credit,1,'Picking all options gives 1 credit');
    });
    QUnit.test('Marking matrix is id(2) with -5 for wrong choice', function(assert) {
        var p = createPartFromJSON({type:'m_n_x', choices: ['a','b'], answers: ['A','B'], matrix: [[1,-5],[-5,1]]});
        var res = mark_part(p, [[true,false],[false,true]]);
        assert.equal(res.credit,1,'Picking correct options gives 1 credit');
        var res = mark_part(p, [[true,true],[true,true]]);
        p.calculateScore();
        assert.equal(p.credit,0,'Picking all options gives 0 credit');
    });

    QUnit.module('Gapfill');
    QUnit.test('One JME gap with answer "x+2"', function(assert) {
        var p = createPartFromJSON({type:'gapfill', gaps: [{type: 'jme', answer: 'x+2'}]});
        var scope = p.getScope();
        scope.question = {getPart: function(path){ return p.gaps.filter(function(p){return p.path==path})[0]; }};
        var res = mark_part(p,['x+2'],scope);
        assert.equal(res.credit,1,'"x+2" correct');
    });
    QUnit.test('One JME gap with string restrictions', function(assert) {
        var done = assert.async();
        var data = {"name":"string restriction in gapfill JME part","tags":[],"metadata":{"description":"","licence":"Creative Commons Attribution 4.0 International"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":[],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"gapfill","marks":0,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>x^2+x</p>\n<p>[[0]]</p>","gaps":[{"type":"jme","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"answer":"x^2+x","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":false,"expectedVariableNames":[],"musthave":{"strings":["("],"showStrings":false,"partialCredit":0,"message":"didn't use ("},"notallowed":{"strings":["^"],"showStrings":false,"partialCredit":0,"message":"did use ^"}}]},{"type":"jme","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"answer":"x","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":false,"expectedVariableNames":[]}]};
        var q = Numbas.createQuestionFromJSON(data);
        q.generateVariables();
        var promise = q.signals.on('ready',function() {
            var p = q.getPart('p0');
            var res = mark_part(p,['x^2+x']);
            assert.ok(res.valid,"x^2+x is valid");
            assert.equal(res.credit,0,"x^2+x is incorrect");
            var res2 = mark_part(p,['x*(x+1)']);
            assert.equal(res2.credit,1,"x*(x+1) is correct");
            done();
        }).catch(function(e) {
            console.error(e);
        });
    });

    QUnit.test('Sort answers', function(assert) {
        var done = assert.async();
        var q = Numbas.createQuestionFromJSON({
            name: 'q',
            parts: [
                {type: 'gapfill', gaps: [{type:'numberentry', minValue: '1', maxValue: '1', marks: 1},{type:'numberentry', minValue: '2', maxValue: '2', marks: 1}]},
                {type: 'gapfill', sortAnswers: true, gaps: [{type:'numberentry', minValue: '1', maxValue: '1', marks: 1},{type:'numberentry', minValue: '2', maxValue: '2', marks: 1}]}
            ]
        });
        q.generateVariables();
        q.signals.on('ready',function() {
            var p = q.getPart('p0');
            var res = mark_part(p,['1','2']);
            assert.equal(res.credit,1,"1,2 correct without sortAnswers");
            var res = mark_part(p,['2','1']);
            assert.equal(res.credit,0,"2,1 incorrect without sortAnswers");
            var p = q.getPart('p1');
            var res = mark_part(p,['1','2']);
            assert.equal(res.credit,1,"1,2 correct with sortAnswers");
            var res = mark_part(p,['2','1']);
            assert.equal(res.credit,1,"2,1 correct with sortAnswers");
            done();
        });
    });

    QUnit.test("Multiply credit in a gap",function(assert) {
        var data = {"type":"gapfill","useCustomName":false,"customName":"","marks":0,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>[[0]]</p>\n<p>[[1]]</p>","gaps":[{"type":"numberentry","useCustomName":false,"customName":"","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1.2","maxValue":"1.2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"precisionType":"dp","precision":"1","precisionPartialCredit":"25","precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":true,"showPrecisionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"numberentry","useCustomName":false,"customName":"","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1.2","maxValue":"1.2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"precisionType":"dp","precision":"1","precisionPartialCredit":"50","precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":true,"showPrecisionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}],"sortAnswers":false};
        var p = createPartFromJSON(data);
        var scope = p.getScope();
        scope.question = {getPart: function(path){ return p.gaps.filter(function(p){return p.path==path})[0]; }};
        var res = mark_part(p,['1.20','1.20'],scope);
        assert.equal(res.credit,0.375,'apply penalty to both gaps');
        var res = mark_part(p,['1.2','1.20'],scope);
        assert.equal(res.credit,0.75,'apply 50% penalty to second gap');
        var res = mark_part(p,['1.20','1.2'],scope);
        assert.equal(res.credit,0.625,'apply 25% penalty to first gap');

        var data2 = {"type":"gapfill","useCustomName":false,"customName":"","marks":0,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>[[0]]</p>\n<p>[[1]]</p>\n<p>[[2]]</p>","gaps":[{"type":"numberentry","useCustomName":false,"customName":"","marks":"10","showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1.2","maxValue":"1.2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"precisionType":"dp","precision":"1","precisionPartialCredit":"50","precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":true,"showPrecisionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"numberentry","useCustomName":false,"customName":"","marks":"10","showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1.2","maxValue":"1.2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"precisionType":"dp","precision":"1","precisionPartialCredit":"50","precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":true,"showPrecisionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"numberentry","useCustomName":false,"customName":"","marks":"10","showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1.2","maxValue":"1.2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"precisionType":"dp","precision":"1","precisionPartialCredit":"50","precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":true,"showPrecisionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}],"sortAnswers":false};
        var p2 = createPartFromJSON(data2);
        var scope = p2.getScope();
        scope.question = {getPart: function(path){ return p2.gaps.filter(function(g){return g.path==path})[0]; }};
        var res = mark_part(p2,['1.20','1.20','1.20'],scope);
        assert.equal(res.credit,0.5,'apply penalty to three gaps');
        assert.equal(p2.creditFraction.toFloat(),0.5,'part.creditFraction is 0.5 as well');
    });

    QUnit.module('Custom marking script');
    QUnit.test('Mark constants of integration',function(assert) {
        var done = assert.async();
        var data = {"name":"Christian's copy of Custom Marking - Constants of Integration","tags":[],"metadata":{"description":"<p>Finding the general solution to a second-order homogeneous differential equation, with undetermined constants of integration (i.e y=Ae^(nx)+Be^(mx)). Custom marking designed to check that the solution is numerically correct, with some constant of integration in front of each term (any non-whitespace containing string accepted for each constant). If not, the answer obtains half-marks if one or both of the constants have been left out; failing that, the answer obtains no marks.</p>","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":["jsxgraph"],"variables":{"r2":{"name":"r2","group":"Ungrouped variables","definition":"2","description":"","templateType":"anything"},"r1":{"name":"r1","group":"Ungrouped variables","definition":"3","description":"","templateType":"anything"}},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":["r1","r2"],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"gapfill","marks":0,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Find the general form of the differential equation $\\simplify{y''-{r1+r2}y'+{r1*r2}y=0}$, up to undetermined coefficients.</p>\n<p>$y=$ [[0]]</p>","gaps":[{"type":"jme","marks":"2","showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{"mark":{"script":"// Get the variables from the question data.\nvar variables = this.question.scope.variables;\nvar unwrap = Numbas.jme.unwrapValue;\nvar r1 = unwrap(variables.r1);\n// Because of the quirks in 'compile', explicit string conversions 1x->x and -1x->-1 have to be made...\nif (r1==1) r1=\"\";\nif (r1==-1) r1=\"-\";\nvar r2 = unwrap(variables.r2);\nif (r2==1) r2=\"\";\nif (r2==-1) r2=\"-\";\n\n// Pull out the student's answer, and set up some rules for checking.\nvar studentTree = Numbas.jme.compile(this.studentAnswer,Numbas.jme.builtinScope);\n// Completely correct solution: numerically correct with constants of integration (m_any(?)) in front.\n// Not sure if you need both orderings of the roots...it seems to break otherwise.\nvar rule = Numbas.jme.compile('m_any(m_any(?) e^('+r1+'x)+m_any(?) e^('+r2+'x),m_any(?) e^('+r2+'x)+m_any(?) e^('+r1+'x))');\n// Solution with one/zero constants of integration (??).\nvar noconstr = Numbas.jme.compile('m_any(?? e^('+r1+'x)+?? e^('+r2+'x),??e^('+r2+'x)+??e^('+r1+'x))');\n\nvar m = Numbas.jme.display.matchTree(rule,studentTree,true);\nvar mpartial = Numbas.jme.display.matchTree(noconstr,studentTree,true);\n\n// Give full credit if it passes the first test..\nif(m)\n{\n this.setCredit(1, 'Correct. Well done!'); \n}\n// ..if not, check whether it passes the second..\nelse if(mpartial)\n{\n  this.setCredit(0.5,'It looks like you have forgotten one or more constants of integration.');\n}  \n// ..if not, the answer must be numerically wrong.\nelse\n{\n  this.setCredit(0,'You appear to have found the roots of the auxiliary equation incorrectly.');\n}","order":"instead"}},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"answer":"e^({r1}x)+e^({r2}x)","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":false,"expectedVariableNames":[]}]}]};
        var data = {"name":"Christian's copy of Custom Marking - Constants of Integration","tags":[],"metadata":{"description":"<p>Finding the general solution to a second-order homogeneous differential equation, with undetermined constants of integration (i.e y=Ae^(nx)+Be^(mx)). Custom marking designed to check that the solution is numerically correct, with some constant of integration in front of each term (any non-whitespace containing string accepted for each constant). If not, the answer obtains half-marks if one or both of the constants have been left out; failing that, the answer obtains no marks.</p>","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":["jsxgraph"],"variables":{"r2":{"name":"r2","group":"Ungrouped variables","definition":"2","description":"","templateType":"anything"},"r1":{"name":"r1","group":"Ungrouped variables","definition":"3","description":"","templateType":"anything"}},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":["r1","r2"],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"gapfill","marks":0,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Find the general form of the differential equation $\\simplify{y''-{r1+r2}y'+{r1*r2}y=0}$, up to undetermined coefficients.</p>\n<p>$y=$ [[0]]</p>","gaps":[{"type":"jme","marks":"2","showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{"mark":{"script":"// Get the variables from the question data.\nvar variables = this.question.scope.variables;\nvar unwrap = Numbas.jme.unwrapValue;\nvar r1 = unwrap(variables.r1);\n// Because of the quirks in 'compile', explicit string conversions 1x->x and -1x->-1 have to be made...\nif (r1==1) r1=\"\";\nif (r1==-1) r1=\"-\";\nvar r2 = unwrap(variables.r2);\nif (r2==1) r2=\"\";\nif (r2==-1) r2=\"-\";\n\n// Pull out the student's answer, and set up some rules for checking.\nvar studentTree = Numbas.jme.compile(this.studentAnswer,Numbas.jme.builtinScope);\n// Completely correct solution: numerically correct with constants of integration (m_any(?)) in front.\n// Not sure if you need both orderings of the roots...it seems to break otherwise.\nvar rule = '(`+- m_name`?;a) * e^('+r1+' x) + (`+- m_name`?;b) * e^('+r2+' x)';\n// Solution with one/zero constants of integration (??).\n\nvar m = Numbas.jme.display.matchExpression(rule,this.studentAnswer,{commutative:true});\n\nif(m) {\n  if(m.a && m.b) {\n    this.setCredit(1, 'Correct. Well done!'); \n  } else {\n    this.setCredit(0.5,'It looks like you have forgotten one or more constants of integration.');\n  }    \n} else {\n  this.setCredit(0,'You appear to have found the roots of the auxiliary equation incorrectly.');\n}","order":"instead"}},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"answer":"e^({r1}x)+e^({r2}x)","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":false,"expectedVariableNames":[]}],"sortAnswers":false}]};
        var q = Numbas.createQuestionFromJSON(data);
        q.generateVariables();
        var promise = q.signals.on('ready',function() {
            var p = q.getPart('p0');
            var res = mark_part(p,['e^(3x)+e^(2x)']);
            assert.ok(res.valid,"e^(3x)+e^(2x) is valid");
            assert.equal(res.credit,0.5,"e^(3x)+e^(2x) is partially correct");
            done();
        });
    });

    QUnit.module('Question');
    QUnit.test('Question', function(assert) {
        var done = assert.async();

        var q = Numbas.createQuestionFromJSON({
            name:'Barg',
            parts: [
                {type:'jme',answer:'x+2', marks: 1}
            ]
        }, 0);
        q.generateVariables();
        q.signals.on('ready',function() {
            var p = q.getPart('p0');
            assert.ok(p,'Part created');
            p.storeAnswer('x+2');
            p.setStudentAnswer();
            q.submit();

            assert.equal(q.name,'Barg');
            assert.equal(q.score,1,'Score is 1');

            done();
        });
    });

    QUnit.test("A big question", function(assert) {
        var done = assert.async();
        assert.expect(3);
        assert.timeout(1000);
        var data = {"name":"Working on standalone part instances","tags":[],"metadata":{"description":"<p>Check that the&nbsp;MarkingScript reimplementations of the marking algorithms work properly.</p>","licence":"None specified"},"statement":"<p>Parts&nbsp;<strong>a</strong> to&nbsp;<strong>f</strong> use the standard marking algorithms.</p>","advice":"","rulesets":{},"extensions":[],"variables":{"m":{"name":"m","group":"Ungrouped variables","definition":"id(2)","description":"","templateType":"anything"}},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":["m"],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"numberentry","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Write a number between 1 and 2</p>","minValue":"1","maxValue":"2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"precisionType":"dp","precision":"2","precisionPartialCredit":0,"precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":false,"showPrecisionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"matrix","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Write a $2 \\times 2$ identity matrix.</p>","correctAnswer":"id(2)","correctAnswerFractions":false,"numRows":"2","numColumns":"2","allowResize":true,"tolerance":0,"markPerCell":true,"allowFractions":false,"precisionType":"dp","precision":0,"precisionPartialCredit":"40","precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":true},{"type":"jme","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Write $x$</p>","answer":"x","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":true,"expectedVariableNames":["x"],"notallowed":{"strings":["("],"showStrings":false,"partialCredit":0,"message":"<p>No brackets!</p>"}},{"type":"patternmatch","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Write \"a+\"</p>","answer":"a+","displayAnswer":"","caseSensitive":true,"partialCredit":"30","matchMode":"exact"},{"type":"1_n_2","marks":0,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Choose choice 1</p>","minMarks":0,"maxMarks":0,"shuffleChoices":false,"displayType":"radiogroup","displayColumns":0,"choices":["Choice 1","Choice 2","Choice 3"],"matrix":["1",0,"-1"],"distractors":["Choice 1 is good","Choice 2 is not great","Choice 3 is bad"]},{"type":"numberentry","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[{"variable":"m","part":"p1","must_go_first":false}],"variableReplacementStrategy":"alwaysreplace","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>What's&nbsp;the determinant of the matrix in part b?</p>","minValue":"det(m)","maxValue":"det(m)","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"numberentry","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"q:\n  apply_marking_script(\"numberentry\",studentAnswer,settings+[\"minvalue\":4,\"maxvalue\":5],1)\n\nr:\n  apply_marking_script(\"numberentry\",studentAnswer,settings+[\"minvalue\":3,\"maxvalue\":4],1)\n\nmark:\n  feedback(\"number between 4 and 5\");\n  concat_feedback(q[\"mark\"][\"feedback\"],marks/2);\n  feedback(\"number between 3 and 4\");\n  concat_feedback(r[\"mark\"][\"feedback\"],marks/2)","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Write a number between 4 and 5, and between 3 and 4.</p>","minValue":"1","maxValue":"2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}]};

        var q = Numbas.createQuestionFromJSON(data);
        q.generateVariables();
        var promise = q.signals.on('ready',function() {
            assert.ok(q);

            var p1 = q.getPart('p1');
            var p5 = q.getPart('p5');
            p1.storeAnswer(matrix([['2','0'],['0','1']]));
            p1.submit();
            assert.equal(p1.credit,0.75,'0.75 credit on part b for one cell wrong');
            p5.storeAnswer('2');
            p5.submit();
            assert.equal(p5.credit,1,'Adaptive marking used for part f');

            done();
        }).catch(function(e) {
            console.log(e);
            done();
            throw(e);
        });
    });

    QUnit.test("Catch error in a marking script", function(assert) {
        var done = assert.async();
        var data = {"name":"Error in marking algorithm","tags":[],"metadata":{"description":"<p>Show a message when there's an error in the marking algorithm</p>","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":[],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"numberentry","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"mark: set_credit(1","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1","maxValue":"1","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}]};

        var q = Numbas.createQuestionFromJSON(data);
        q.generateVariables();
        var promise = q.signals.on('ready').catch(function(e){
            assert.equal(e.originalMessage,'marking.script.error parsing notes','Error is "marking.script.error parsing notes"');
            done();
        });

    });

    unit_test_questions.forEach(function(data) {
        var name = data.name;
        QUnit.module(name);
        var q = Numbas.createQuestionFromJSON(data);
        q.generateVariables();
        q.signals.on('ready', function() {
            q.allParts().forEach(function(p) {
                p.json.unitTests.forEach(function(test) {
                    console.log(test);
                    QUnit.test(test.name, function(assert) {
                        p.storeAnswer(test.answer.value);
                        p.setStudentAnswer();
                        var res = p.mark_answer(p.rawStudentAnswerAsJME(),p.getScope());
                        console.log(res);
                        assert.ok(res.state_valid.mark);
                        test.notes.forEach(function(note) {
                            assert.ok(res.states[note.name]!==undefined,'Note "'+note.name+'" exists');
                            var value = res.values[note.name];
                            var expectedValue = Numbas.jme.builtinScope.evaluate(note.expected.value);
                            var bothValues = expectedValue && value;
                            if(bothValues) {
                                if(Numbas.util.equalityTests[expectedValue.type] && Numbas.util.equalityTests[value.type]) {
                                    differentValue = !Numbas.util.eq(expectedValue,value);
                                } else {
                                    differentValue = expectedValue.type != value.type;
                                }
                            } else {
                                differentValue = expectedValue==value;
                            }
                            assert.notOk(differentValue,'Note "'+note.name+'" has value "'+note.expected.value+'"');
                        });

                        var final_res = p.markAgainstScope(p.getScope(),{markingFeedback:[],warnings:[]});
                        console.log('final_res',final_res);
                        var messages = final_res.markingFeedback.map(function(action){ return action.message; }).join('\n');
                        var mark_note = test.notes.find(function(n) { return n.name=='mark' });
                        var expectedMessages = mark_note.expected.messages.join('\n');
                        console.log(messages);
                        assert.equal(messages,expectedMessages,'Feedback messages');
                        var warnings = final_res.warnings.join('\n');
                        var expectedWarnings = mark_note.expected.warnings.join('\n');
                        assert.equal(warnings, expectedWarnings,'Warnings');
                        assert.equal(res.state_valid.mark,mark_note.expected.valid,'Valid');
                        assert.equal(final_res.credit,mark_note.expected.credit,'Credit');
                        /*
                        var differentError = this.error() != this.expected.error();
                        var differentValidity = this.valid() != this.expected.valid();
                        var differentCredit = this.credit() != this.expected.credit();
                        */
                    });
                });
            });
        }).catch(function(e) {
            console.log(e);
            throw(e);
        });
    });
});
