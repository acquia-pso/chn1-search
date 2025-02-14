# Yext Search Integration Application

## Overview
This application provides a modern, component-based integration with Yext's search services, offering both universal and vertical search capabilities with a focus on performance and user experience.

## Core Components

### Data Layer
- **Yext Store**: Manages search state and settings using URL parameters
- **Data Access Layer**: Handles communication with Yext APIs
- **Type System**: Comprehensive TypeScript definitions for all Yext-related data structures

### UI Components
- **Universal Search**: Cross-vertical search functionality
- **Vertical Search**: Specialized search within specific verticals
- **Search Results**: Display and pagination of search results
- **Faceted Navigation**: Filter management and display
- **Entity Display**: Standardized display of various entity types

### Features
- URL-based state management for shareable searches
- Faceted search with dynamic filters
- Universal and vertical-specific search capabilities
- Responsive design with modern UI components
- Type-safe implementation using TypeScript

## Project Structure
```
src/
├── components/
│   ├── outline-yext-universal/    # Universal search components
│   ├── outline-yext-vertical/     # Vertical-specific components
│   ├── outline-yext-pager/        # Pagination components
│   └── outline-yext-entities/     # Entity display components
├── libraries/
│   ├── data-access-yext/         # Yext API integration
│   └── ui-yext/                  # Shared UI components
├── controllers/                   # Application controllers
└── tests/                        # Test suites
```

## Technical Documentation
For detailed technical documentation, please refer to the following guides:
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Component Documentation](docs/COMPONENTS.md)
- [Data Layer Documentation](docs/DATA_LAYER.md)
- [Development Guide](docs/DEVELOPMENT.md)

## Getting Started
1. Install dependencies:
   ```bash
   yarn install
   ```

2. Configure Yext API credentials in your environment

3. Start the development server:
   ```bash
   yarn dev
   ```

## Contributing
Please read our [Contributing Guide](docs/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

# CHN-Yext

## Preview in Gitpod
https://gitpod.io/#https://github.com/phase2/chn-yext

## Overview
This package contains the necessary files and configurations to set up and run the CHN-Yext project.

## Installation and Setup

Follow these steps to get the project up and running on your local machine:

### Prerequisites

- Ensure you have [Node.js](https://nodejs.org/) installed on your system.
- Yarn package manager is required. If you do not have Yarn installed, you can install it by running:
  ```bash
  npm install -g yarn
  ```
- You need access to the repo [chn-yext](https://github.com/phase2/chn-yext)

### Installation

1. Clone the repository to your local machine.
2. Navigate to the project directory.
3. Install the dependencies:
   ```bash
   yarn install
   ```

### Building the Project

To build the project, run the following command:
```bash
yarn build
```
This command compiles the source code and generates output files in the `dist` directory.

### Viewing the Application

After building the project, open the `build.html` file in your web browser to view the application.

## Support

For any issues or questions, please open an issue on the GitHub repository issue tracker.


## Workflow
There are different kinds of work flow for yext project details can be found on the [Yext Workflow Options](https://phase2tech.atlassian.net/wiki/spaces/INNOVATION/pages/3536846854/Yext+Workflow+Options)

We can mark tickets in the name for the workflow need

Items that need code changes will be QA in Gitpod

When ready to deploy to aquia the developer will make a PR to the main branch of the aquia repo https://github.com/acquia-pso/chn1-search

### Generating Testing workspace in Gitpod
For code changes testers should use gitpod to create a env from the main branch when they are ready to test.
They do this by:
* go to the [CHN new workspace page](https://gitpod.io/#https://github.com/phase2/chn-yext)
* Click Continue
* A code editor page will popup and then a min or so later a test page will popup
* Test on the second page. You can keep this page around until you are told there was a new code push, then you must stop using this site and run this process again

#### Dashboard
If you want to go back to one of your other workspaces you can see them all in the [Dashboard](https://gitpod.io/workspaces).

Note that if you do not use a workspace it will shutdown, and if you do not touch it for 2 weeks it will be automatically deleted



#### Share workspace.
If as a testing you need to share the env with a developer to show them things are not working then:
* go to the code page
* click on the hamburger menu
* click on GitPod:Share Running Workspace
* click share in the popup
* look to the bottom right of the page and click Copy URL to Clipboard
* send the url to the developer




