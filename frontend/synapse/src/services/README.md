# Services Layer

This directory contains all the service functions that handle API calls and business logic for the application.

## Structure

- `resolveService.ts` - Services related to DaVinci Resolve integration
- `subtitleService.ts` - Services for subtitle operations (remove filler words, replace all, etc.)
- `utilService.ts` - Utility services (diff calculation, etc.)
- `exportService.ts` - Services for exporting subtitles
- `importService.ts` - Services for importing files
- `timelineService.ts` - Services for timeline navigation
- `index.ts` - Export index for all services

## Usage

Import services in your components or hooks like this:

```typescript
import { fetchSubtitles, removeFillerWords } from '../services';
```

Or import specific services:

```typescript
import { fetchSubtitles } from '../services/resolveService';
import { removeFillerWords } from '../services/subtitleService';
```

## Benefits

1. **Separation of Concerns**: API calls are separated from UI components and state management
2. **Reusability**: Service functions can be reused across different parts of the application
3. **Testability**: Services can be easily unit tested without UI dependencies
4. **Maintainability**: All API interactions are centralized in one place