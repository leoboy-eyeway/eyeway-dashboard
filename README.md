# Eyeway 2.0

## Advanced Pothole Detection & Management System

Eyeway 2.0 is a modern web-based application designed to monitor, track, and manage road damage in Iligan City, Philippines. The system provides real-time visualization of pothole locations with 3D mapping, severity-based classification, and advanced data analytics.

## Features

### Core Functionality
- **3D Interactive Map**: Displays pothole locations using Mapbox GL with 3D terrain and buildings
- **2D/3D View Toggle**: Switch between 2D and immersive 3D map views
- **Severity Classification**: Potholes are categorized into four severity levels:
  - Low (Green) - Minor surface issues
  - Medium (Yellow) - Moderate damage
  - High (Orange) - Significant damage requiring attention
  - Critical (Red) - Severe damage requiring immediate repair
- **Advanced Filtering**: Filter potholes by severity level and status (reported, inspected, scheduled, in-progress, completed)
- **Real-time Updates**: Live status tracking of reported potholes via Supabase backend
- **3D Capture Mode**: Record video for 3D Gaussian Splatting reconstruction (in development)

### Technical Features
- Responsive design for mobile and desktop
- Geolocation integration for accurate positioning
- Data visualization with charts and analytics
- Document management system
- Toast notifications for user feedback
- Optimized marker rendering for performance

## Technology Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.1
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS with custom animations
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **Map Rendering**: Mapbox GL JS 2.15.0
- **3D Graphics**: React Three Fiber + Three.js

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime subscriptions

### Development
- **TypeScript**: Full type safety with strict mode enabled
- **Linting**: ESLint with TypeScript support
- **Code Quality**: Organized utilities and data transformers

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd eyeway-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

   Required environment variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase publishable key
   - `VITE_MAPBOX_TOKEN`: Your Mapbox access token

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## Project Structure

```
eyeway-dashboard/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── Header.tsx
│   │   ├── MapboxView.tsx
│   │   └── ...
│   ├── pages/            # Page-level components
│   │   ├── Index.tsx     # Main dashboard
│   │   └── Capture3D.tsx # 3D capture interface
│   ├── lib/              # Utilities and helpers
│   │   ├── constants.ts  # App configuration
│   │   ├── dataTransformers.ts
│   │   └── utils.ts
│   ├── types/            # TypeScript type definitions
│   ├── hooks/            # Custom React hooks
│   ├── integrations/     # External service integrations
│   │   └── supabase/
│   └── data/             # Mock/seed data
├── public/               # Static assets
└── ...config files
```

## Usage

### Main Dashboard
1. **View Potholes**: Interactive map displays all reported potholes with color-coded severity markers
2. **Toggle View**: Switch between 2D and 3D map views using the mode toggle button
3. **Filter Data**: Use the Filters panel to narrow down potholes by severity and status
4. **View Details**: Click on any pothole marker to see detailed information
5. **Update Status**: Change pothole status (reported → inspected → scheduled → in-progress → completed)
6. **Analytics**: Open the Data panel to view charts and statistics
7. **Documents**: Access the Documents panel for related files and reports

### 3D Capture
1. Navigate to `/capture-3d`
2. Allow location access for accurate positioning
3. Adjust marker on map if needed
4. Start camera and record 360° video around the pothole
5. Process video for 3D reconstruction (feature in development)

## Development

### Code Quality Standards
- TypeScript strict mode enabled
- ESLint for code linting
- Organized component structure
- Memoized callbacks for performance
- Centralized constants and utilities
- Data transformation layer for API integration

### Performance Optimizations
- Differential marker updates (only changed markers re-render)
- Memoized callbacks with useCallback
- Computed values with useMemo
- Code splitting with React Router
- Optimized bundle with Vite

### Environment Variables
All sensitive configuration is managed through environment variables. Never commit `.env` files to version control.

## API Integration

The application integrates with Supabase for:
- Pothole data storage and retrieval
- Real-time updates
- User authentication (future feature)
- File storage for images and videos

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Follow the existing code style and TypeScript conventions
4. Write meaningful commit messages
5. Ensure all TypeScript checks pass (`npm run build`)
6. Submit a pull request with a clear description

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- **Mapbox** for mapping and geocoding services
- **Supabase** for backend infrastructure
- **shadcn/ui** for beautiful UI components
- **City of Iligan** for collaboration and data
- **OpenStreetMap** contributors for map data
- All contributors and testers of the application

## Support

For issues, questions, or suggestions, please open an issue on GitHub.
