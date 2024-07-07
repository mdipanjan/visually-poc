// dependency-visualizer.js
const { execSync } = require('child_process');
const express = require('express');

// Function to get nested dependencies using npm list
function getNestedDependencies(showDev = false, maxDepth = 4) {
    try {
        const command = `npm list ${showDev ? '' : '--prod'} --json --depth=${maxDepth}`;
        const output = execSync(command, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 }); // Increased buffer size
        return JSON.parse(output);
    } catch (error) {
        console.error('Error executing npm list:', error.message);
        return {};
    }
}

// Function to convert npm list output to D3 hierarchical format
function convertToD3Format(npmListOutput) {
    function formatNode(node, name) {
        return {
            name: name ? `${name}@${node.version}` : node.name,
            children: node.dependencies ? 
                Object.entries(node.dependencies).map(([depName, depNode]) => 
                    formatNode(depNode, depName)
                ) : undefined,
            value: 1 // Add a value for each node, useful for sunburst diagram sizing
        };
    }

    return formatNode(npmListOutput);
}

// Main function
async function main() {
    // Set up Express server
    const app = express();
    app.use(express.static('public'));

    app.get('/data', (req, res) => {
        const showDev = req.query.showDev === 'true';
        const depth = parseInt(req.query.depth) || 4;
        
        const dependencyTree = getNestedDependencies(showDev, depth);
        const d3Data = convertToD3Format(dependencyTree);
        res.json(d3Data);
    });

    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Open http://localhost:${PORT} in your browser to view the dependency graph`);
    });
}

main().catch(console.error);    