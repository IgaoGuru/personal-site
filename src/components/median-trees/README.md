# MedianTrees

MedianTrees is a web application for calculating *Estimated Completion Times* based on a recent [cool statistical study on developer time estimates](https://thesearesystems.substack.com/p/task-estimation-conquering-hofstadters?triedRedirect=true
).

For each leaf task on the task tree, you must estimate the number of hours to completion. 
MedianTrees will then display

${\color{red}median\ time\ (what\ to\ tell\ your\ boss\ )}$ | ${\color{yellow}p=0.95\ (what\ to\ tell\ a\ stakeholder\ )}$ | ${\color{green}p=0.99\ (what\ to\ tell\ a\ really\ important\ stakeholder\ )}$

like this 

## How to use

You can input tasks by hand or import tasks from a Jira board. 
For Jira, export to csv with all attributes, then load the csv file with the `Load Jira` button

## 🚀 How 2 Build

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   [Node.js](https://nodejs.org/) (LTS version recommended, includes npm)
*   [pnpm](https://pnpm.io/installation)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url> MedianTrees
    cd MedianTrees
    ```
    *(Replace `<your-repository-url>` with the actual repository URL.)*

2.  **Install dependencies:**
    ```bash
    pnpm i
    ```

3.  **Run the development server:**
    ```bash
    pnpm run dev
    ```

4.  Open your browser and navigate to `http://localhost:5173` (or the port specified in your console output).

## 📄 License

This project is under the GPLv3 CopyLeft License. Software here is free as in Libre.

Special thanks to [ReactFlow](https://reactflow.dev/) and [DagreJS](https://github.com/dagrejs/dagre) for their amazing libraries that made this project possible.
