# Finalize VortexJob Platform

The goal of this phase is to finalize the VortexJob dashboard by fully implementing the remaining empty pages, ensuring a complete, premium, and functional experience across the entire distributed orchestration platform.

## Proposed Changes

### Workflows Module
#### [MODIFY] [WorkflowsPage.tsx](file:///c:/Users/Asus/OneDrive/Desktop/projects/codity/frontend/src/pages/WorkflowsPage.tsx)
- Transform the placeholder page into a rich visual DAG (Directed Acyclic Graph) viewer for job dependencies.
- Implement an interface to visualize multi-step job pipelines (e.g., ETL jobs, data processing) using standard layout techniques or a visual grid.
- Connect to the existing `jobApi.getDependencies` to show parent/child relationships between jobs.

### Logs & Observability Module
#### [MODIFY] [LogsPage.tsx](file:///c:/Users/Asus/OneDrive/Desktop/projects/codity/frontend/src/pages/LogsPage.tsx)
- Build a global log viewer that aggregates `job_logs` across the cluster.
- Include a terminal-like aesthetic with syntax highlighting for metadata payloads.
- Implement quick filters (Error, Info, Warn) and search functionality.

### Performance & Settings Modules
#### [MODIFY] [PerformancePage.tsx](file:///c:/Users/Asus/OneDrive/Desktop/projects/codity/frontend/src/pages/PerformancePage.tsx)
- Implement detailed metrics visualizations (e.g., Average Job Duration, Error Rates over time) utilizing the backend stats API.
#### [MODIFY] [SettingsPage.tsx](file:///c:/Users/Asus/OneDrive/Desktop/projects/codity/frontend/src/pages/SettingsPage.tsx)
- Implement a mock settings page for Project API Keys, Retry Policies configuration, and global platform preferences to make the dashboard feel like a complete enterprise tool.

## User Review Required

> [!IMPORTANT]
> Since we are finalizing the application, the above implementations will use existing backend APIs (like logs and stats) and combine them into premium UI components. 
> 
> Are there any specific features or data points you want prioritized in the **Workflows** or **Performance** pages before I finalize the build?

## Verification Plan

### Manual Verification
- Navigate through every single sidebar route to ensure no empty states remain.
- Ensure the wine-red dark glassmorphic design language is perfectly consistent across all new pages.
- Verify that API calls for logs and stats render correctly on their respective pages.
