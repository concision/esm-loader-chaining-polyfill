/**
 * TypeScript port of Node.js's C implementation: https://github.com/nodejs/node/blob/f06f3c0ea0405ef247cbdcf597159ab600d8c83e/src/node_options.cc#L1051-L1090
 */
export function parseNodeOptions(node_options: string): string[] {
    const nodeArguments = [];

    let isInString = false;
    let isStartingNewArgument = true;
    for (let i = 0; i < node_options.length; i++) {
        let char: string = node_options[i];

        // backslashes escape the following character
        if (char === "\\" && isInString) {
            if (i + 1 === node_options.length) {
                return nodeArguments;
            } else {
                char = node_options[i++];
            }
        } else if (char === " " && !isInString) {
            isStartingNewArgument = true;
            continue;
        } else if (char === "\"") {
            isInString = !isInString;
            continue;
        }

        if (isStartingNewArgument) {
            nodeArguments.push(char);
            isStartingNewArgument = false;
        } else {
            nodeArguments[nodeArguments.length - 1] += char;
        }
    }

    return nodeArguments;
}
