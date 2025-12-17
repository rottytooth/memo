var currHistoryLoc = 0;

const clearMemory = () => {
    for (let i = 1; i <= 12; i++) {
        const element = document.getElementById(`n-${i}`);
        if (element) {
            element.innerHTML = '';
        }
    }
    updateStateList();
    saveCurrentState();
};

const getScreenHistory = () => {
    const history = [];
    for (let i = 1; i <= 12; i++) {
        const element = document.getElementById(`n-${i}`);
        // Save all slots, even empty ones, to preserve positions
        history.push(element ? element.innerHTML : '');
    }
    return history;
};

const restoreScreenHistory = (history) => {
    if (!history || history.length === 0) return;
    
    history.forEach((html, index) => {
        const element = document.getElementById(`n-${index + 1}`);
        if (element) {
            element.innerHTML = html;
        }
    });
};

const saveCurrentState = () => {
    if (typeof MemoStateManager !== 'undefined' && typeof memo !== 'undefined') {
        const screenHistory = getScreenHistory();
        MemoStateManager.saveState(memo.varlist, screenHistory);
    }
};

const fadeOut = (text) => {
    for (var i = 12; i > 0; i--) {
        if (i > 1) {
            document.getElementById("n-" + i).innerHTML = document.getElementById("n-" + (i - 1)).innerHTML;
        }
    }
    document.getElementById("n-1").innerHTML = `<span class="query">${capitalizeFirstLetter(text)}</span>`;

    // Save state immediately after query is added to screen
    saveCurrentState();

    setTimeout(() => {
        addResponse(text);
    }, 300);
};

const updateStateList = () => {
    let state_list_tbody = document.getElementById("state_table").getElementsByTagName('tbody')[0];
    let tbody = document.createElement('tbody');
    for (const key in memo.varlist) {
        let row = tbody.insertRow();
        let lead = row.insertCell();
        lead.innerHTML = "&nbsp;I remember";
        lead.className = "varname_store"
        let varname = row.insertCell();
        varname.classList.add("right_td"); 
        let namespan = document.createElement("span");
        namespan.innerText = key;
        namespan.classList.add("vrbl");
        varname.appendChild(namespan);
        for (let i = 0; i < memo.varlist[key].params.length; i++) {
            if (i == 0) {
                varname.append("(");
            } else {
                varname.append(", ");
            }
            let paramspan = document.createElement("span");
            paramspan.innerText = memo.varlist[key].params[i].varname;
            paramspan.classList.add("vrbl");
            varname.appendChild(paramspan);
        }
        if (memo.varlist[key].params.length > 0) {
            varname.append(")");
        }
        varname.classList.add("right_td"); 
        let varvalue = row.insertCell();
        let valueText = `as ${memo.tools.expToStr(memo.varlist[key], true)}.`;
        
        // Truncate if longer than 200 characters
        if (valueText.length > 200) {
            // Find the last space before 200 characters
            let truncated = valueText.substring(0, 200);
            let lastSpace = truncated.lastIndexOf(' ');
            if (lastSpace > 0) {
                valueText = truncated.substring(0, lastSpace) + '...';
            } else {
                valueText = truncated + '...';
            }
        }
        
        varvalue.innerHTML = valueText;
        row.style.opacity = `var(--n${memo.varlist[key].fade})`;
    }
    state_list_tbody.parentNode.replaceChild(tbody, state_list_tbody);
    updateCanvas();
}

const updateCanvas = () => {
    const canvas = document.getElementById('memo-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // If no variables, set minimal size
    if (Object.keys(memo.varlist).length === 0) {
        canvas.width = 400;
        canvas.height = 100;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }
    
    // Calculate depth for each variable (0 = no dependencies, 1 = depends on depth 0, etc.)
    const depths = {};
    const visited = {};
    
    const calculateDepth = (varname) => {
        if (varname in depths) return depths[varname];
        if (varname in visited) return 0; // circular reference safety
        
        visited[varname] = true;
        
        if (!(varname in memo.varlist)) {
            depths[varname] = 0;
            return 0;
        }
        
        const variable = memo.varlist[varname];
        const dependencies = memo.interpreter.getDependencies(variable);
        
        if (!dependencies || dependencies.length === 0) {
            depths[varname] = 0;
            return 0;
        }
        
        // Depth is 1 + max depth of dependencies
        let maxDepth = 0;
        for (const dep of dependencies) {
            const depDepth = calculateDepth(dep);
            if (depDepth > maxDepth) {
                maxDepth = depDepth;
            }
        }
        
        depths[varname] = maxDepth + 1;
        return depths[varname];
    };
    
    // Calculate depths for all variables
    for (const key in memo.varlist) {
        calculateDepth(key);
    }
    
    // Group variables by depth
    const depthGroups = {};
    for (const key in memo.varlist) {
        const depth = depths[key];
        if (!depthGroups[depth]) {
            depthGroups[depth] = [];
        }
        depthGroups[depth].push(key);
    }
    
    // Calculate layout
    const maxDepth = Math.max(...Object.keys(depthGroups).map(d => parseInt(d)));
    const pillHeight = 30;
    const pillPadding = 10;
    const horizontalSpacing = 150; // Fixed spacing between columns
    
    // Calculate total height needed for all variables
    let maxVariablesInDepth = 0;
    for (let depth = 0; depth <= maxDepth; depth++) {
        if (depthGroups[depth] && depthGroups[depth].length > maxVariablesInDepth) {
            maxVariablesInDepth = depthGroups[depth].length;
        }
    }
    const verticalSpacing = 60;
    const totalHeight = maxVariablesInDepth * verticalSpacing;
    const topOffset = 20; // Start from top with small offset
    const bottomMargin = 20;
    
    // Calculate required canvas dimensions
    const requiredWidth = (maxDepth + 2) * horizontalSpacing;
    const requiredHeight = totalHeight + topOffset + bottomMargin;
    
    // Resize canvas if needed
    canvas.width = Math.max(300, requiredWidth);
    canvas.height = Math.max(100, requiredHeight);
    
    // Store positions for drawing arrows later
    const positions = {};
    
    ctx.font = '14px hack, monospace';
    ctx.textAlign = 'center';
    
    // Draw each depth level from left to right
    for (let depth = 0; depth <= maxDepth; depth++) {
        if (!depthGroups[depth]) continue;
        
        const variables = depthGroups[depth];
        const groupHeight = variables.length * verticalSpacing;
        const startY = topOffset + (totalHeight - groupHeight) / 2;
        
        variables.forEach((key, index) => {
            const x = horizontalSpacing * (depth + 1);
            const y = startY + (index * verticalSpacing);
            
            // Calculate pill width based on text
            const textWidth = ctx.measureText(key).width;
            const pillWidth = textWidth + (pillPadding * 2);
            
            // Store position for arrows
            positions[key] = { x, y, width: pillWidth, height: pillHeight };
            
            // Get fade level for this variable
            const fadeLevel = memo.varlist[key].fade;
            const opacity = fadeLevel <= 11 ? (12 - fadeLevel) / 11 : 0;
            
            // Draw red pill shape with opacity
            ctx.globalAlpha = opacity;
            ctx.fillStyle = '#c33';
            ctx.beginPath();
            ctx.roundRect(x - pillWidth/2, y, pillWidth, pillHeight, pillHeight/2);
            ctx.fill();
            
            // Draw white text for variable name
            ctx.fillStyle = '#fff';
            ctx.fillText(key, x, y + pillHeight/2 + 5);
            ctx.globalAlpha = 1.0; // Reset alpha
        });
    }
    
    // Draw arrows from variables to their dependencies
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    
    for (const key in memo.varlist) {
        const variable = memo.varlist[key];
        const dependencies = memo.interpreter.getDependencies(variable);
        
        if (dependencies && dependencies.length > 0) {
            const fromPos = positions[key];
            if (!fromPos) continue;
            
            // Get fade level for opacity
            const fadeLevel = memo.varlist[key].fade;
            const opacity = fadeLevel <= 11 ? (12 - fadeLevel) / 11 : 0;
            ctx.globalAlpha = opacity;
            
            for (const dep of dependencies) {
                const toPos = positions[dep];
                if (!toPos) continue;
                
                // Draw arrow from left side of current to right side of dependency
                const fromX = fromPos.x - fromPos.width/2;
                const fromY = fromPos.y + fromPos.height/2;
                const toX = toPos.x + toPos.width/2;
                const toY = toPos.y + toPos.height/2;
                
                ctx.beginPath();
                ctx.moveTo(fromX, fromY);
                ctx.lineTo(toX, toY);
                ctx.stroke();
            }
            
            ctx.globalAlpha = 1.0; // Reset alpha after drawing arrows
        }
    }
    
    ctx.setLineDash([]);
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
    saveCurrentState();
}

const capitalizeFirstLetter = (text) => {
    if (text.length > 0) {
        text = Array.from(text.toUpperCase())[0] + text.toLowerCase().substring(1)
    }
    return text;
}

const initializeMemo = () => {
    // Restore saved state if available
    if (typeof MemoStateManager !== 'undefined' && typeof memo !== 'undefined') {
        const savedState = MemoStateManager.loadState();
        if (savedState) {
            MemoStateManager.restoreInterpreterState(memo, savedState);
            const screenHistory = MemoStateManager.restoreScreenHistory(savedState);
            restoreScreenHistory(screenHistory);
            updateStateList();
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    let input = document.getElementById('n');
    input.focus();

    let cursorField = document.getElementById("n"); 

    cursorField.addEventListener("keydown", function(event) {
        if (event.key === "ArrowUp" && currHistoryLoc < 12) {
            const queryElement = document.querySelector(`#n-${currHistoryLoc+1} .query`);
            if (queryElement) {
                currHistoryLoc++;
                cursorField.value = queryElement.innerText;
            }

            event.preventDefault();
            return false;
        }
    
        if (event.key === "ArrowDown") {
            if (currHistoryLoc <= 1) {
                cursorField.value = "";
                currHistoryLoc = 0;
            } else {
                const queryElement = document.querySelector(`#n-${currHistoryLoc-1} .query`);
                if (queryElement) {
                    currHistoryLoc--;
                    cursorField.value = queryElement.innerText;
                }

                event.preventDefault();
                return false;
            }
        }

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
        if (event.key === "Enter") {
            currHistoryLoc = 0;
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
        
        // Preserve cursor position when capitalizing
        const cursorPosition = cursorField.selectionStart;
        const newValue = capitalizeFirstLetter(cursorField.value);
        if (newValue !== cursorField.value) {
            cursorField.value = newValue;
            cursorField.setSelectionRange(cursorPosition, cursorPosition);
        }
    });
});

window.addEventListener("load", () => {
    // Initialize memo state after all scripts have loaded
    initializeMemo();
});

document.addEventListener("load", () => {
    var input = document.getElementById('n');
    input.focus();
    initializeMemo();
});
document.addEventListener("keypress", (event) => {
    var input = document.getElementById('n');
    input.focus();
    if (event.target.id !== 'n') {
        const clonedEvent = new KeyboardEvent(event.type, {
            key: event.key,
            code: event.code,
            isComposing: event.isComposing,
            bubbles: event.bubbles,
            cancelable: event.cancelable,
            composed: event.composed
        });
        // event.target.id = 'n';
        input.dispatchEvent(clonedEvent);
    }
});
