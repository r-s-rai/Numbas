Numbas.queueScript('jme-calculus',['jme-base','jme-rules'],function() {
/** @file Code to do with differentiation and integration
 *
 * Provides {@link Numbas.jme.calculus}
 */

var jme = Numbas.jme;
var TNum = Numbas.jme.types.TNum;

/** @namespace Numbas.jme.calculus */
var calculus = jme.calculus = {};

var differentiation_rules = [
    ['$n','0'],
    ['?;a + ?`+;b','$diff(a) + $diff(b)'],
    ['?;a - ?`+;b','$diff(a) - $diff(b)'],
    ['+?;a','$diff(a)'],
    ['-?;a','-$diff(a)'],
    ['?;u / ?;v', '(v*$diff(u) - u*$diff(v))/v^2'],
    ['?;u * ?;v','u*$diff(v) + v*$diff(u)'],
    ['e^?;p', '$diff(p)*e^p'],
    ['(`+-$n);a ^ ?;b', 'ln(a) * $diff(b) * a^b'],
    ['?;a^(`+-$n);p','p*$diff(a)*a^(p-1)'],
];
/** Rules for differentiating parts of expressions.
 *
 * Occurrences of the function `$diff` in the result expression have differentiation applied with respect to the same variable
 *
 * @type {Object.<Numbas.jme.rules.Rule>}
 */
calculus.differentiation_rules = differentiation_rules.map(function(r) {
    return new Numbas.jme.rules.Rule(r[0],r[1],'acgs');
});

/** Standard derivatives of functions of one variable.
 * 
 * {@link Numbas.jme.calculus.differentiate} replaces `x` in these expressions with the argument of the function, and applies the chain rule
 *
 * @type Object.<Numbas.jme.tree>
 */
calculus.derivatives = {
    'cos': '-sin(x)',
    'sin': 'cos(x)',
    'e': 'e^x',
    'ln': '1/x',
    'log': '1/(ln(10)*x)',
    'tan': 'sec(x)^2',
    'cosec': '-cosec(x)*cot(x)',
    'sec': 'sec(x)*tan(x)',
    'cot': '-cosec(x)^2',
    'arcsin': '1/sqrt(1-x^2)',
    'arccos': '-1/sqrt(1-x^2)',
    'arctan': '1/(1+x^2)',
    'cosh': 'sinh(x)',
    'sinh': 'cosh(x)',
    'tanh': 'sech(x)^2',
    'sech': '-sech(x)*tanh(x)',
    'cosech': '-cosech(x)*coth(x)',
    'coth': '-cosech(x)^2',
    'arccosh': '1/sqrt(x^2-1)',
    'arcsinh': '1/sqrt(x^2+1)',
    'arctanh': '1/(1-x^2)',
    'sqrt': '1/(2*sqrt(x))'
};

for(var x in calculus.derivatives) {
    calculus.derivatives[x] = jme.compile(calculus.derivatives[x]);
}

/** Functions that differentiation distributes over.
 *
 * i.e. d/dx f(a, b, ...) = f(da/dx, db/dx, ...)
 *
 * @type Object.<Boolean>
 */
calculus.distributing_derivatives = {
    'vector': true,
    'matrix': true,
    'rowvector': true,

}

var function_derivative_rule = new jme.rules.Rule('m_func(?;f,?;a)','$diff(m_listval(a,0))*standard_derivative(f,m_listval(a,0))');

/** Differentiate the given expression with respect to the given variable name
 *
 * @param {Numbas.jme.tree} tree
 * @param {String} x
 * @param {Numbas.jme.Scope} scope
 * @returns Numbas.jme.tree
 */
var differentiate = calculus.differentiate = function(tree,x,scope) {
    function apply_diff(tree) {
        if(jme.isFunction(tree.tok,'$diff')) {
            var res = base_differentiate(tree.args[0]);
            return res;
        } else if(jme.isFunction(tree.tok,'standard_derivative')) {
            var name = tree.args[0].tok.value;
            var derivative = calculus.derivatives[name];
            var arg = apply_diff(tree.args[1]);
            var scope = new jme.Scope({variables: {x: arg}});
            return jme.substituteTree(derivative,scope);
        }
        if(tree.args) {
            var args = tree.args.map(apply_diff);
            return {tok: tree.tok, args: args};
        }
        return tree;
    }

    function distribute_differentiation(tree) {
        var nargs = tree.args.map(base_differentiate);
        return {tok: tree.tok, args: nargs};
    }

    var original_tree = tree;
    function base_differentiate(tree) {
        var tok = tree.tok;

        switch(tok.type) {
        case 'number':
            return {tok: new TNum(0)};
        case 'name':
            return {tok: new TNum(tok.name==x ? 1 : 0)};
        case 'list':
            if(tree.args) {
                return distribute_differentiation(tree);
            } else {
                return {tok: new jme.types.TList(tree.tok.value.map(function(v) { return new TNum(0); }))};
            }
        case 'expression':
            return base_differentiate(tok.tree);
        case 'op':
        case 'function':
            if(tree.args.length==1 && tok.name in calculus.derivatives) {
                var res = function_derivative_rule.replace(tree,scope);
                return apply_diff(res.expression);
            }
            if(calculus.distributing_derivatives[tok.name]) {
                return distribute_differentiation(tree);
            }
            break;
        }


        for(var i=0;i<calculus.differentiation_rules.length;i++) {
            var result = calculus.differentiation_rules[i].replace(tree,scope);
            if(result.changed) {
                var res = apply_diff(result.expression);
                return res;
            }
        }

        throw(new Numbas.Error("jme.calculus.unknown derivative",{tree: jme.display.treeToJME(tree)}));
    }

    return base_differentiate(original_tree);
}

});
