Command = c:(Print / Let / Reset) ("."?/"!"?) {
	return c;
}

Reset = ("R"/"r")"emember" v:Identifier {
	return {
    	cmd: "reset",
        varname: v.varname
    };
}

Let = ("R"/"r")"emember" _ v:Identifier _ "as" exp:Expression {
	return {
    	cmd: "let",
        varname: v.varname,
        exp: exp
    };
}

Type = f:(("I"/"i")"nt" ("eger")?/("F"/"f")"loat"/("S"/"s")"tring"/("A"/"a")"rray"/("C"/"c")"har" ("acter")?) {
	return f.join("").toLowerCase();
} / $(.*) {
	return "undetermined"
}

Print = ("T"/"t")"ell me" (_ "about")? _ exp:Identifier {
	return {
    	cmd: "print",
        exp: exp
    };
}

/*
  Expressions
*/
/*
Expression = _ v:(Addition / S_Expression / Literal / Identifier / Atom) {
	return v;
}
*/

S_Expression = _? "(" _? a:Atom* ")" _? {
	return {
        class: "exp",
        type: "S_Expression",
        value: a
  };
}

Atom = e:(Expression) _? {
    return {
        class: "exp",
        type: "atom",
        value: e
    }
}

Identifier = IntLiteral {
	throw new Error("Cannot assign a new value to a reserved name");
}
/ v:[a-zA-ZäöüßÄÖÜ_]+ {
	return {
        type: "Variable",
        varname: v.join("")
    };
}


Expression = _ a:Addition  {
	return a;
}

Addition = head:Term tail:(_ ("plus" / "minus") _ Term)* {
      return tail.reduce(function(result, element) {
        if (element[1] === "plus") { 
          return {
              class: "exp",
              type: "Addition",
              left: result,
              right: element[3]
          };
        }
        if (element[1] === "minus") {
          return {
              class: "exp",
              type: "Subtraction",
              left: result,
              right: element[3]
          };
        }
      }, head);
    }
    
Term = head:Factor tail:(_ ("times" / "divided by") _ Factor)* {
      return tail.reduce(function(result, element) {
        if (element[1] === "times") { 
          return {
              class: "exp",
              type: "Multiplication",
              left: result,
              right: element[3]
          };
        }
        if (element[1] === "divided by") { 
          return {
              class: "exp",
              type: "Division",
              left: result,
              right: element[3]
          };
        }
    }, head);
}

Factor
  = "the sum of" _ e1:Addition _ "and" _ e2:Addition
  {
    return {
      class: "exp",
      type: "Addition",
      left: e1,
      right: e2
    };
  } / "the difference between" _ e1:Addition _ "and" _ e2:Addition
  {
    return {
      class: "exp",
      type: "Subtraction",
      left: e1,
      right: e2
    };
  } / "the product of" _ e1:Addition _ "and" _ e2:Addition
  {
    return {
      class: "exp",
      type: "Multiplication",
      left: e1,
      right: e2
    };
  } / "the quotient of" _ e1:Addition _ "and" _ e2:Addition
  {
    return {
      class: "exp",
      type: "Division",
      left: e1,
      right: e2
    };
} / Literal / Identifier

Literal = StringLiteral / CharLiteral / IntLiteral

IntLiteral =
    mil:MillionsDigit DigitSeparator? thou:ThousandsDigit? DigitSeparator? hun:HundredsDigit? DigitSeparator? end:EndDigit?
{
	let retval = mil;
    if (mil) retval += mil;
    if (thou) retval += thou;
    if (hun) retval += hun;
    if (end) retval += end;
	return { type: "IntLiteral", value: retval };
} / thou:ThousandsDigit DigitSeparator? hun:HundredsDigit? DigitSeparator? end:EndDigit?
{
	let retval = thou;
    if (hun) retval += hun;
    if (end) retval += end;
	return { type: "IntLiteral", value: retval };
} 
/ hun:HundredsDigit DigitSeparator? end:EndDigit?
{
	let retval = hun;
    if (end) retval += end;
	return { type: "IntLiteral", value: retval };
} / end:EndDigit
{
	return { type: "IntLiteral", value: end };
}

MillionsDigit = 
	hun:HundredsDigit DigitSeparator? end:EndDigit? _ ("M"/"m") "illion"
{
	let retval = 0;
    if (end) retval += end;
    if (hun) retval += hun;
	return retval * 1000000;
}

ThousandsDigit = 
	hun:HundredsDigit DigitSeparator? end:EndDigit? _ ("T"/"t") "housand"
{
	let retval = 0;
    if (end) retval += end;
    if (hun) retval += hun;
	return retval * 1000;
} / end:EndDigit (_ / "-")? ("T"/"t") "housand" 
{
	return end * 1000;
}

HundredsDigit = 
	end:EndDigit (_ / "-")? ("H"/"h") "undred"
{
	return end * 100;
}

EndDigit = TeensDigit / tens:TensDigit (_ "and" _ / "," _ / "-" / _)? ones:OnesDigit?
{
	let retval = 0;
	if (tens) retval += tens;
	if (ones) retval += ones;
	return retval;
} / ones:OnesDigit

TensDigit = 
	"ten" { return 10; } /
	"twenty" { return 20; } /
    "thirty" { return 30; } /
    "forty" { return 40; } /
    "fifty" { return 50; } /
    "sixty" { return 60; } /
	"seventy" { return 70; } /
    "eighty" { return 80; } /
    "ninety" { return 90; }

OnesDigit = 
	"zero" { return 0; } /
	"one" { return 1; } /
    "two" { return 2; } /
    "three" { return 3; } /
    "four" { return 4; } /
    "five" { return 5; } / 
    "six" { return 6; } /
    "seven" { return 7; } /
    "eight" { return 8; } /
    "nine" { return 9; } /
    "zero" { return 0; } 

TeensDigit = 
    "eleven" { return 11; } /
    "twelve" { return 12; } /
    "thirteen" { return 13; } /
    "fourteen" { return 14; } /
    "fifteen" { return 15; } / 
    "sixteen" { return 16; } /
    "seventeen" { return 17; } /
    "eighteen" { return 18; } /
    "nineteen" { return 19; }

DigitSeparator = (", and" _ / " and" _ / "," _ / _)

StringLiteral  = '"' chars:DoubleStringCharacter* '"' {
    return {
        class: "value",
        type: "string",
        value: chars.join('')
    };
}

CharLiteral = "'" char:SingleStringCharacter "'" {
    return {
        class: "value",
        type: "char",
        value: char
    };
}

DoubleStringCharacter
    = !('"' / "\\") char:. { return char; }
    / "\\" sequence:EscapeSequence { return sequence; }

SingleStringCharacter
    = !("'" / "\\") char:. { return char; }
    / "\\" sequence:EscapeSequence { return sequence; }

EscapeSequence
    = "'"
    / '"'
    / "\\"
    / "b"  { return "\b";   }
    / "f"  { return "\f";   }
    / "n"  { return "\n";   }
    / "r"  { return "\r";   }
    / "t"  { return "\t";   }
    / "v"  { return "\x0B"; }

_ "whitespace"
  	= [ \t\n\r]*
	{ return null; }
