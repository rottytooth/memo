{
class MemoSyntaxError extends Error {
  constructor(msg, code, details) { 
    super(msg);
    this.code = code;
    this.details = details;
  }
}

}

Command = c:(Print / Let / Reset) ("."?/"!"?) _* {
	return c;
}

Reset = (("R"/"r")"emember" / ("U"/"u")"nderstand" ) v:Identifier {
	return {
    	cmd: "reset",
        varname: v.varname
    };
}

Let = (("R"/"r")"emember" / ("U"/"u")"nderstand"  / ("R"/"r")"ecognize" ) _ v:Identifier _ "as" _ lbd:Lambda {
	return {
    	cmd: "let",
        varname: v.varname,
        lambda: lbd,
        is_lambda: true
    };
} / (("R"/"r")"emember" / ("U"/"u")"nderstand"  / ("R"/"r")"ecognize" ) _ v:Identifier _ "as" exp:Expression {
	return {
    	cmd: "let",
        varname: v.varname,
        exp: exp,
        is_lambda: false
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

Identifier = v:NumberLiteral {
	throw new MemoSyntaxError("Cannot assign a new value to a reserved name", "reserved", {"name": v["value"]});
}
/ v:("remember"/"million"/"thousand"/"hundred"/"billion") // add other reserved words here
{
  throw new MemoSyntaxError("Cannot assign a new value to a reserved name", "reserved", v)
}
/ v:[a-zA-ZäöüßÄÖÜ_]+ {
	return {
        type: "Variable",
        varname: v.join("")
    };
}

Lambda = "lambda" {
  return {
    	type: "Lambda",

      // exp: exp
    };
}
