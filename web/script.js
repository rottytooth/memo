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
    
    // Sort variables within each depth to minimize crossings
    // Use barycentric heuristic: sort by average position of dependencies
    const maxDepth = Math.max(...Object.keys(depthGroups).map(d => parseInt(d)));
    
    // First pass: assign initial positions
    const tempPositions = {};
    for (let depth = 0; depth <= maxDepth; depth++) {
        if (!depthGroups[depth]) continue;
        depthGroups[depth].forEach((key, index) => {
            tempPositions[key] = index;
        });
    }
    
    // Sort each depth level (except depth 0) by average position of dependencies
    for (let depth = 1; depth <= maxDepth; depth++) {
        if (!depthGroups[depth]) continue;
        
        depthGroups[depth].sort((a, b) => {
            const aDeps = memo.interpreter.getDependencies(memo.varlist[a]) || [];
            const bDeps = memo.interpreter.getDependencies(memo.varlist[b]) || [];
            
            // Calculate average position of dependencies
            const aAvg = aDeps.length > 0 
                ? aDeps.reduce((sum, dep) => sum + (tempPositions[dep] || 0), 0) / aDeps.length
                : 0;
            const bAvg = bDeps.length > 0
                ? bDeps.reduce((sum, dep) => sum + (tempPositions[dep] || 0), 0) / bDeps.length
                : 0;
            
            return aAvg - bAvg;
        });
        
        // Update positions after sorting
        depthGroups[depth].forEach((key, index) => {
            tempPositions[key] = index;
        });
    }
    
    // Calculate layout
    const pillHeight = 30;
    const pillPadding = 10;

    // Calculate total height needed for all variables
    let maxVariablesInDepth = 0;
    for (let depth = 0; depth <= maxDepth; depth++) {
        if (depthGroups[depth] && depthGroups[depth].length > maxVariablesInDepth) {
            maxVariablesInDepth = depthGroups[depth].length;
        }
    }

    // Dynamic horizontal spacing based on available width and pill widths
    // Get the canvas container width (or viewport width)
    const canvasContainer = canvas.parentElement;
    const availableWidth = canvasContainer ? canvasContainer.offsetWidth : window.innerWidth * 0.9;

    // Calculate maximum pill width for each depth to determine minimum spacing needed
    // We need to set up a temporary canvas context to measure text
    ctx.font = '14px hack, monospace';
    let maxPillWidth = 0;
    for (let depth = 0; depth <= maxDepth; depth++) {
        if (!depthGroups[depth]) continue;
        for (const key of depthGroups[depth]) {
            const textWidth = ctx.measureText(key).width;
            const pillWidth = textWidth + (pillPadding * 2);
            maxPillWidth = Math.max(maxPillWidth, pillWidth);
        }
    }

    // Calculate horizontal spacing
    const numColumns = maxDepth + 2; // +2 for margins on both sides
    const idealSpacing = 150; // Preferred spacing when we have room
    const minGap = 10; // Minimum gap between pills
    const minSpacing = Math.max(80, maxPillWidth + minGap); // At least pill width + gap

    // Calculate spacing that fits available width
    let horizontalSpacing = Math.floor(availableWidth / numColumns);

    // Clamp between min and ideal
    horizontalSpacing = Math.max(minSpacing, Math.min(idealSpacing, horizontalSpacing));

    // Dynamic vertical spacing based on horizontal spacing
    // If nodes are close horizontally, space them more vertically for clarity
    const baseVerticalSpacing = 60;
    const compressionFactor = (idealSpacing - horizontalSpacing) / (idealSpacing - minSpacing);
    const verticalSpacing = baseVerticalSpacing + Math.max(0, compressionFactor * 40);

    const topOffset = 20; // Start from top with small offset
    const bottomMargin = 20;

    // Calculate total height needed based on dynamic vertical spacing
    const totalHeight = maxVariablesInDepth * verticalSpacing;

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
            
            // Draw red pill shape with color shift as it fades
            // At full opacity: darker red #c33 (204, 51, 51)
            // As it fades: shift toward brighter, more saturated pink to avoid tan look
            ctx.globalAlpha = 1.0;
            const red = 204 + (255 - 204) * (1 - opacity);    // 204 -> 255 as it fades
            const green = 51 * opacity;                        // 51 -> 0 as it fades
            const blue = 51 + (120 - 51) * (1 - opacity);      // 51 -> 120 as it fades for pinker tone
            ctx.fillStyle = `rgba(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}, ${opacity})`;
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
    // text = text.toLowerCase();
    let reply = memo.interpreter.parse(text);

    // Capitalize first letter of response
    reply = capitalizeFirstLetter(reply);

    // Replace all '\n' with Unicode U+21B5 (↵)
    reply = reply.replace(/\\n/g, '\u21B5');

    newSpan.innerText = reply;
    document.getElementById("n-1").appendChild(newSpan);
    updateStateList();
    saveCurrentState();
}

const capitalizeFirstLetter = (text) => {
    if (text.length > 0) {
        // Find the first character that's not inside a string literal
        let inString = false;
        let firstNonStringIndex = -1;
        
        for (let i = 0; i < text.length; i++) {
            if (text[i] === '"') {
                inString = !inString;
            } else if (!inString && text[i] !== ' ' && firstNonStringIndex === -1) {
                firstNonStringIndex = i;
                break;
            }
        }
        
        // Only capitalize if we found a character outside of strings and it's lowercase
        if (firstNonStringIndex !== -1 && text[firstNonStringIndex] !== text[firstNonStringIndex].toUpperCase()) {
            text = text.substring(0, firstNonStringIndex) + 
                   text[firstNonStringIndex].toUpperCase() + 
                   text.substring(firstNonStringIndex + 1);
        }
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
        // Don't intercept letter keys - let browser handle them naturally
        // This allows proper cursor positioning
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
        
        // Don't capitalize on special keys
        if (event.key === "ArrowUp" || event.key === "ArrowDown" || 
            event.key === "ArrowLeft" || event.key === "ArrowRight" ||
            event.key === "Shift" || event.key === "Control" || 
            event.key === "Alt" || event.key === "Meta") {
            return;
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

document.addEventListener("keydown", (event) => {
    var input = document.getElementById('n');
    
    // If the textarea already has focus, no need to do anything
    if (document.activeElement === input) {
        return;
    }
    
    // Don't steal focus if user is interacting with other elements
    const activeElement = document.activeElement;
    const isInteractiveElement = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.isContentEditable
    );
    
    if (isInteractiveElement) {
        return;
    }
    
    // Don't steal focus if there's an active text selection anywhere on the page
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
        return;
    }
    
    // Don't steal focus if user clicked on something other than body/html
    if (activeElement && activeElement.tagName !== 'BODY' && activeElement.tagName !== 'HTML') {
        return;
    }
    
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
