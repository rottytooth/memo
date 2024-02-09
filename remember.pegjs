{
	const clean_var = (input) => {
        input = input.trim().toLowerCase();
		input = input.replace(new RegExp(/\bmy\b/,'gi'), 'your');
		input = input.replace(new RegExp(/\bmine\b/,'gi'), 'yours');
		input = input.replace(new RegExp(/\bmyself\b/,'gi'), 'yourself');
		input = input.replace(new RegExp(/\bme\b/,'gi'), 'you');
        return input;
    };
}

Command = c:(Print / Declare / Let / Reset) _* {
	return c;
}

Reset = ("R"/"r")"emember" v:Variable {
	return {
    	cmd: "reset",
        varname: v.varname,
        all_vars: [v.varname]
    };
}

Declare = ("R"/"r")"emember" _ v:Variable _ ("as an"/"as a") _ t:Type {
	return {
    	cmd: "declare",
        varname: v.varname,
        all_vars: [v.varname],
        type: t
    };
}

Let = ("R"/"r")"emember" _ v:Variable _ "as" exp:Expression {
	return {
    	cmd: "let",
        varname: v.varname,
        all_vars: [v.varname],
        exp: exp
    };
}

Type = f:(("I"/"i")"nt" ("eger")?/("F"/"f")"loat"/("S"/"s")"tring"/("A"/"a")"rray"/("C"/"c")"har" ("acter")?) {
	return f.join("").toLowerCase();
} / $(.*) {
	return "undetermined"
}

Print = ("T"/"t")"ell me" (_ "about")? _ exp:Variable {
	return {
    	cmd: "print",
        exp: exp
    };
}

/*
  Expressions
*/

Expression = _ v:(Value / Variable / SExpression) {
	return v;
}

Value = Float / Integer / Char / String

SExpression = _? "(" _? a:Atom* ")" _? {
	return {
        class: "exp",
        type: "SExpression",
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

String  = '"' chars:DoubleStringCharacter* '"' {
    return {
        class: "value",
        type: "string",
        value: chars.join('')
    };
}

Char = "'" char:SingleStringCharacter "'" {
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

Integer "integer" = [0-9]+ {
    return {
        class: "value",
        type: "int",
        value: parseInt(text(), 10)
    };

}

Float "float"  = [0-9]+ "." [0-9]+ {
  return {
        class: "value",
        type: "float",
        value: parseFloat(text(), 10)
    };
}

Variable = v:$(!" as " .)* {
	return {
        type: "variable",
        varname: v
    };
}

_ "whitespace" = [\r\n \t]+
