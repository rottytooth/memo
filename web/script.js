const fadeOut = (text) => {
    for (var i = 12; i > 0; i--) {
        if (i > 1) {
            document.getElementById("n-" + i).innerHTML = document.getElementById("n-" + (i - 1)).innerHTML;
        }
    }
    document.getElementById("n-1").innerHTML = capitalizeFirstLetter(text);

    setTimeout(() => {
        addResponse(text);
    }, 300);
};

const buildTree = () => {
    for (const key in memo.varlist) {
        console.log(key);
    }
}

const updateStateList = () => {
    buildTree();
    let state_list_tbody = document.getElementById("state_table").getElementsByTagName('tbody')[0];
    let tbody = document.createElement('tbody');
    for (const key in memo.varlist) {
        let row = tbody.insertRow();
        let lead = row.insertCell();
        lead.innerHTML = "&nbsp;I remember";
        lead.className = "varname_store"
        let varname = row.insertCell();
        varname.innerText = key;
        varname.classList.add("right_td"); 
        varname.classList.add("vrbl");
        let varvalue = row.insertCell();
        varvalue.innerHTML = `as ${memo.varlist[key].formatted_value(true)}.`;
        row.style.opacity = `var(--n${memo.varlist[key].fade})`;
    }
    state_list_tbody.parentNode.replaceChild(tbody, state_list_tbody);
}

const addResponse = (text) => {
    // FIXME: This seems like it should be part of the interpreter
    let newSpan = document.createElement('span');
    newSpan.className = "response";
    text = text.toLowerCase();
    let reply = memo.interpreter.parse(text);
    
    if (/\d/.test(reply)) {
        confused = ["I am feeling confused.","I am unsure.","Something is not right."];
        reply = confused[Math.floor(Math.random() * confused.length)];
    }

    newSpan.innerText = reply;
    document.getElementById("n-1").appendChild(newSpan);
    updateStateList();
}

const capitalizeFirstLetter = (text) => {
    if (text.length > 0) {
        text = Array.from(text.toUpperCase())[0] + text.toLowerCase().substring(1)
    }
    return text;
}

document.addEventListener("DOMContentLoaded", () => {
    let input = document.getElementById('n');
    input.focus();

    let cursorField = document.getElementById("n"); 

    cursorField.addEventListener("keydown", function(event) {
        if (cursorField.value.length == 0) {
            if (event.altKey || event.ctrlKey || event.metaKey) {
                return true;
            }
            if (/^\p{L}$/u.test(event.key)) {
                cursorField.value = event.key.toUpperCase();
                event.preventDefault();
                return false;
            }
            if (event.key == " ") {
                event.preventDefault();
                return false;
            }
        }
        if (/^\p{L}$/u.test(event.key)) {
            if (event.altKey || event.ctrlKey || event.metaKey) {
                return true;
            }
            cursorField.value += event.key.toLowerCase();
            event.preventDefault();
            return false;
        }
    });

    cursorField.addEventListener("keyup", function(event) {
        if (event.keyCode === 13) {
            cursorField.value = cursorField.value.trim();
            if (!!cursorField.value.match(/[,:!?]$/)) {
                // cut off last char if non-period punctuation
                cursorField.value = cursorField.value.substring(0, cursorField.value.length - 1);
            }
            if (cursorField.value.slice(-1) != ".") {
                cursorField.value += ".";
            }
            fadeOut(cursorField.value);
            cursorField.value = "";
            event.preventDefault();
            return false;
        }
        cursorField.value = capitalizeFirstLetter(cursorField.value);
    });
});

document.addEventListener("click", () => {
    var input = document.getElementById('n');
    input.focus();
});
