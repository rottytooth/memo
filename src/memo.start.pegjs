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

Reset = (("R"/"r")"emember" / ("U"/"u")"nderstand" ) _ v:Identifier {
	return {
    	cmd: "reset",
        varname: v.varname
    };
}

AdditionalParams = (","/ (_ "and")) _ p:Identifier {
	return p;
}

Let = (("R"/"r")"emember" / ("U"/"u")"nderstand"  / ("R"/"r")"ecognize" ) _ v:Identifier _ "with" _ p:Identifier a:AdditionalParams* _ "as" _ lbd:Lambda {
	if (!!a) {
	    p = [p].concat(a);
    }
	return {
    	cmd: "let",
        varname: v.varname,
        exp: lbd,
        params: p
    };
} / (("R"/"r")"emember" / ("U"/"u")"nderstand"  / ("R"/"r")"ecognize" ) _ v:Identifier _ "as" lbd:Lambda {
	return {
    	cmd: "let",
        varname: v.varname,
        exp: lbd,
        params: []
    };
}

Type = f:(("I"/"i")"nt" ("eger")?/("F"/"f")"loat"/("S"/"s")"tring"/("A"/"a")"rray"/("C"/"c")"har" ("acter")?) {
	return f.join("").toLowerCase();
} / $(.*) {
	return "undetermined"
}

Print = ("T"/"t")"ell me" (_ "about")? _ exp:Expression {
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
} / Expression