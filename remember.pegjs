Command = Remember / Asking / Saying

Remember = "Remember" _ c:Loop {
	return c;
}

Asking = ("A"/"a")"sking" _ "if" _ "they" _ e:ExpAnd t:Then? {
	return {
	    type: "cmd",
    	name: "Asking",
        exp: e,
        then: t
    };
}

Saying = ("s"/"S") "aying" _ e:ExpAnd {
	return {
	    type: "cmd",
    	name: "Saying",
        exp: e,
    };
}

Then = "and" _ c:Command (_ ("when"/"if") _ "they" _ "do")? {
	return c;
}

Loop = "counting" _ r:Range
{
	return {
    	type: "cmd",
    	name: "Loop",
        exp: r
    };
}

ExpAnd = e1:Expression _? "and" _ e2:(ExpAnd/Expression) {
	return {
    	type: "exp",
    	name: "And",
        exp: [e1,e2]
    };
} / Expression

Expression = Themselves / Range / Boolean / Number

Themselves = "themselves" / "their number"

Boolean = DivideEvenly

DivideEvenly = "divide" _ ("evenly" _)? "by" _ e:Expression {
	return {
    	type: "exp",
    	name: "DivideEvenly",
        exp: e
    };
}

Range = ("from" _)? f:Number "to" _ t:Number {
	return {
    	type: "exp",
    	name: "Range",
        from: f,
        to: t
    };
}
    
Number = d:Digit {
	return { 
    	type: "exp",
    	name: "number",
    	value: d 
    };
}

Digit = 
  	"one" _? { return 1; } /
  	"two" _? { return 2; } / 
    "three" _? { return 3; } /
    "four" _? { return 4; } /
    "five" _? { return 5; } /
    "six" _? { return 6; } /
    "seven" _? { return 7; } /
    "eight" _? { return 8; } /
    "nine" _? { return 9; } /
    "ten" _? { return 10; } /
    (("a"/"one") _)? "hundred" _? { return 100; }

_ "whitespace" = [\r\n \t]+