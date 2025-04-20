const fadeOut = (text) => {
    for (var i = 12; i > 0; i--) {
        if (i > 1) {
            document.getElementById("n-" + i).innerHTML = document.getElementById("n-" + (i - 1)).innerHTML;
        }
    }
    document.getElementById("n-1").innerHTML = text.toLowerCase();

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
        lead.innerText = "I remember";
        lead.className = "varname_store"
        let varname = row.insertCell();
        varname.innerText = key;
        varname.className = "right_td"
        let varvalue = row.insertCell();
        varvalue.innerText = `as ${memo.varlist[key].formatted_value()}.`;
        row.style.opacity = `var(--n${memo.varlist[key].fade})`;
    }
    state_list_tbody.parentNode.replaceChild(tbody, state_list_tbody);
}

const addResponse = (text) => {
    let newSpan = document.createElement('span');
    newSpan.className = "response";
    text = text.toLowerCase();
    let reply = memo.interpreter.parse(text);
    newSpan.innerText = reply;
    document.getElementById("n-1").appendChild(newSpan);
    updateStateList();
}

document.addEventListener("DOMContentLoaded", () => {
    let input = document.getElementById('n');
    input.focus();

    let cursorField = document.getElementById("n");

    cursorField.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) {
        // console.log(event.target.value);
        fadeOut(cursorField.value);
        cursorField.value = "";
        event.preventDefault();
        return false;
    }
    });
});

document.addEventListener("click", () => {
    var input = document.getElementById('n');
    input.focus();
});
