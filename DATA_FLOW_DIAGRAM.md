# Data Flow Diagram - Visual Guide

## Complete Upload to Processing Flow

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant Capture3D
    participant Supabase
    participant KiriEngine
    participant ProcessingPage
    participant Storage

    %% Phase 1: Location Capture
    rect rgb(200, 220, 255)
        Note over User,Browser: Phase 1: Location Capture
        User->>Browser: Allow GPS Access
        Browser->>Capture3D: Get Location
        Capture3D->>Capture3D: Reverse Geocode (Mapbox)
        Capture3D-->>User: Show Map + Address
    end

    %% Phase 2: Video Capture
    rect rgb(220, 255, 200)
        Note over User,Capture3D: Phase 2: Video Recording
        User->>Browser: Allow Camera Access
        Browser->>Capture3D: MediaStream API
        User->>Capture3D: Start Recording
        Capture3D->>Capture3D: MediaRecorder → Blob
        User->>Capture3D: Stop Recording
        Capture3D-->>User: Show Video Preview
    end

    %% Phase 3: Database Creation
    rect rgb(255, 240, 200)
        Note over User,Supabase: Phase 3: Create Database Record
        User->>Capture3D: Click "Generate 3D Model"
        Capture3D->>Supabase: INSERT INTO potholes
        Note right of Supabase: road_id, pothole_number<br/>lat, lng, severity<br/>status='reported'<br/>model_url=NULL
        Supabase-->>Capture3D: Return Pothole UUID
    end

    %% Phase 4: Kiri Engine Upload
    rect rgb(255, 220, 220)
        Note over Capture3D,KiriEngine: Phase 4: Upload to Kiri Engine
        Capture3D->>KiriEngine: POST /3dgs/video
        Note right of KiriEngine: FormData:<br/>- videoFile: Blob<br/>- isMesh: '0'<br/>- fileFormat: 'ply'
        KiriEngine-->>Capture3D: { serialize: "task_abc123" }
    end

    %% Phase 5: Task Tracking
    rect rgb(230, 200, 255)
        Note over Capture3D,ProcessingPage: Phase 5: Task Tracking
        Capture3D->>Browser: Save to localStorage
        Note right of Browser: {<br/>  id: "task_...",<br/>  taskId: "serialize_id",<br/>  potholeId: "uuid",<br/>  status: 'pending',<br/>  progress: 0<br/>}
        Capture3D->>ProcessingPage: Navigate to /processing/{id}
    end

    %% Phase 6: Polling
    rect rgb(200, 255, 255)
        Note over ProcessingPage,KiriEngine: Phase 6: Status Polling (Every 5s)
        loop Every 5 seconds
            ProcessingPage->>KiriEngine: GET /task/status/{serialize}
            KiriEngine-->>ProcessingPage: { status, progress, result }
            ProcessingPage->>Browser: Update localStorage
            ProcessingPage-->>User: Show Progress (0-100%)
        end
    end

    %% Phase 7: Completion & Storage
    rect rgb(200, 255, 200)
        Note over ProcessingPage,Storage: Phase 7: Model Completion
        KiriEngine-->>ProcessingPage: status='completed', modelUrl
        ProcessingPage->>KiriEngine: Download Model (fetch)
        KiriEngine-->>ProcessingPage: Model Blob (.ply)
        ProcessingPage->>Storage: Upload to Supabase Storage
        Note right of Storage: Bucket: models<br/>Path: 3d-models/<br/>pothole_{id}.ply
        Storage-->>ProcessingPage: Public URL
    end

    %% Phase 8: Database Update
    rect rgb(255, 255, 200)
        Note over ProcessingPage,Supabase: Phase 8: Update Database
        ProcessingPage->>Supabase: UPDATE potholes
        Note right of Supabase: SET model_url = '<url>'<br/>WHERE id = pothole_id
        Supabase-->>ProcessingPage: Success
        ProcessingPage->>Browser: Update localStorage
        Note right of Browser: status='completed'<br/>modelUrl='<url>'
        ProcessingPage-->>User: Show Success Screen
    end
```

---

## State Machine Diagram

```mermaid
stateDiagram-v2
    [*] --> LocationCapture: User Opens Capture3D
    
    LocationCapture --> VideoRecording: Location Confirmed
    VideoRecording --> VideoPreview: Recording Stopped
    VideoPreview --> DatabaseCreation: Generate Clicked
    
    DatabaseCreation --> KiriUpload: Pothole Created
    KiriUpload --> TaskCreated: Upload Success
    TaskCreated --> Polling: Navigate to Processing
    
    Polling --> Polling: Status Check (Every 5s)
    Polling --> ModelDownload: Status = Completed
    Polling --> Failed: Status = Failed
    
    ModelDownload --> StorageUpload: Model Downloaded
    StorageUpload --> DatabaseUpdate: Upload Success
    DatabaseUpdate --> Completed: Update Success
    
    Completed --> [*]: User Returns
    Failed --> [*]: User Dismisses
    
    note right of Polling
        Progress: 0% → 100%
        Statuses:
        - pending
        - processing
        - completed
        - failed
    end note
    
    note right of DatabaseCreation
        Creates pothole record
        with model_url = NULL
    end note
    
    note right of DatabaseUpdate
        Updates pothole record
        SET model_url = '<url>'
    end note
```

---

## Component Interaction Diagram

```mermaid
graph TB
    subgraph "Browser (Frontend)"
        A[Capture3D Page]
        B[ProcessingProgress Page]
        C[localStorage Tasks]
        D[MediaRecorder API]
        E[GPS/Location API]
    end
    
    subgraph "Supabase Backend"
        F[(potholes table)]
        G[(pothole_documents table)]
        H[Storage: models bucket]
    end
    
    subgraph "External API"
        I[Kiri Engine API]
        J[Mapbox Geocoding]
    end
    
    subgraph "Services Layer"
        K[kiriEngine.ts]
        L[processingTasksManager.ts]
    end
    
    %% Capture Flow
    E -->|Location Data| A
    J -->|Address| A
    D -->|Video Blob| A
    A -->|Create Record| F
    A -->|Upload Video| K
    K -->|POST /3dgs/video| I
    K -->|Task ID| L
    L -->|Store| C
    A -->|Navigate| B
    
    %% Processing Flow
    B -->|Read Tasks| C
    B -->|Poll Status| K
    K -->|GET /status| I
    I -->|Progress| K
    K -->|Update| L
    L -->|Update| C
    
    %% Completion Flow
    I -->|Model URL| K
    K -->|Download| I
    K -->|Upload Model| H
    H -->|Public URL| K
    K -->|Update| F
    K -->|Update| L
    L -->|Update| C
    
    %% Styling
    classDef frontend fill:#e1f5ff,stroke:#4dabf7
    classDef backend fill:#fff3bf,stroke:#ffd43b
    classDef external fill:#ffe3e3,stroke:#ff6b6b
    classDef service fill:#e7f5ff,stroke:#74c0fc
    
    class A,B,C,D,E frontend
    class F,G,H backend
    class I,J external
    class K,L service
```

---

## Data Storage Architecture

```mermaid
erDiagram
    POTHOLES ||--o{ POTHOLE_DOCUMENTS : "has many"
    POTHOLES ||--o| MODELS_STORAGE : "references"
    POTHOLES ||--o| PROCESSING_TASKS : "tracked by"
    
    POTHOLES {
        uuid id PK
        text road_id
        int pothole_number
        numeric latitude
        numeric longitude
        text severity
        numeric detection_accuracy
        text status
        timestamptz report_date
        text description
        text reported_by
        text image_url
        jsonb lidar_data
        text model_url FK "→ Storage URL"
        timestamptz created_at
    }
    
    POTHOLE_DOCUMENTS {
        uuid id PK
        uuid pothole_id FK
        text title
        text type
        text status
        text priority
        timestamptz due_date
        text assigned_to
        timestamptz created_at
    }
    
    MODELS_STORAGE {
        text path "3d-models/pothole_ID.ply"
        text bucket "models (public)"
        text public_url "https://...supabase.co/..."
        blob file_data ".ply file"
    }
    
    PROCESSING_TASKS {
        text id PK "localStorage key"
        text taskId "Kiri serialize ID"
        text potholeId FK "→ potholes.id"
        text videoUrl "blob:http://..."
        text status "pending|processing|completed|failed"
        int progress "0-100"
        text statusMessage
        text error
        text modelUrl "→ Supabase Storage"
        timestamptz createdAt
    }
```

---

## File Upload Flow

```mermaid
flowchart TD
    Start([User Captures Video]) --> Check{Video Source?}
    
    Check -->|Camera| Record[MediaRecorder API]
    Check -->|File Upload| FileInput[<input type='file'>]
    
    Record --> Blob1[Video Blob in Memory]
    FileInput --> Blob2[File as Blob]
    
    Blob1 --> CreateDB[Create Pothole in DB]
    Blob2 --> CreateDB
    
    CreateDB --> GetID[Get Pothole UUID]
    GetID --> PrepareUpload[Prepare FormData]
    
    PrepareUpload --> KiriUpload{Kiri Engine Upload}
    
    KiriUpload -->|Success| TaskID[Get Task Serialize ID]
    KiriUpload -->|Error| ErrorHandler[Show Error Toast]
    
    TaskID --> SaveLocal[Save to localStorage]
    SaveLocal --> Navigate[Navigate to /processing]
    
    Navigate --> Poll{Poll Status Every 5s}
    
    Poll -->|pending/processing| UpdateProgress[Update Progress Bar]
    UpdateProgress --> Poll
    
    Poll -->|completed| Download[Download Model from Kiri]
    Poll -->|failed| ShowError[Show Error Message]
    
    Download --> UploadSupabase[Upload to Supabase Storage]
    UploadSupabase --> GetURL[Get Public URL]
    GetURL --> UpdateDB[Update potholes.model_url]
    UpdateDB --> UpdateLocal[Update localStorage]
    UpdateLocal --> Success([Show Success Screen])
    
    ErrorHandler --> End([End])
    ShowError --> End
    Success --> End
    
    style Start fill:#90ee90
    style Success fill:#90ee90
    style End fill:#ffcccb
    style ErrorHandler fill:#ffcccb
    style ShowError fill:#ffcccb
    style Poll fill:#add8e6
    style KiriUpload fill:#ffd700
```

---

## Error Handling Flow

```mermaid
flowchart TD
    Start([Upload Initiated]) --> Validate{Validation}
    
    Validate -->|No Location| Err1[Error: Location Required]
    Validate -->|No Video| Err2[Error: Video Required]
    Validate -->|No API Key| Err3[Error: Kiri API Key Missing]
    Validate -->|✓ Valid| CreateRecord[Create Pothole Record]
    
    CreateRecord -->|DB Error| Err4[Error: Database Failed]
    CreateRecord -->|Success| Upload[Upload to Kiri]
    
    Upload -->|Network Error| Err5[Error: Network Failed]
    Upload -->|API Error| Err6[Error: Kiri API Failed]
    Upload -->|Success| Poll[Poll Status]
    
    Poll -->|Timeout| Err7[Error: Processing Timeout]
    Poll -->|Kiri Failed| Err8[Error: Processing Failed]
    Poll -->|Success| Download[Download Model]
    
    Download -->|Download Failed| Err9[Error: Download Failed]
    Download -->|Success| UploadStorage[Upload to Storage]
    
    UploadStorage -->|Storage Error| Err10[Error: Storage Failed]
    UploadStorage -->|Success| UpdateDB[Update Database]
    
    UpdateDB -->|DB Error| Err11[Error: Update Failed]
    UpdateDB -->|Success| Complete([Success])
    
    %% Error Recovery
    Err1 --> Retry1{Can Retry?}
    Err2 --> Retry1
    Err5 --> Retry2{Can Retry?}
    Err6 --> Retry2
    Err9 --> Retry3{Can Retry?}
    Err10 --> Retry3
    
    Retry1 -->|Yes| Start
    Retry1 -->|No| Fail([Failed - User Action Required])
    
    Retry2 -->|Yes| Upload
    Retry2 -->|No| Fail
    
    Retry3 -->|Yes| Download
    Retry3 -->|No| Fail
    
    Err3 --> Config[Configuration Required]
    Err4 --> Manual[Manual Intervention]
    Err7 --> Manual
    Err8 --> Manual
    Err11 --> Manual
    
    Config --> Fail
    Manual --> Fail
    
    style Complete fill:#90ee90
    style Fail fill:#ffcccb
    style Err1 fill:#ffe6e6
    style Err2 fill:#ffe6e6
    style Err3 fill:#ffe6e6
    style Err4 fill:#ffe6e6
    style Err5 fill:#ffe6e6
    style Err6 fill:#ffe6e6
    style Err7 fill:#ffe6e6
    style Err8 fill:#ffe6e6
    style Err9 fill:#ffe6e6
    style Err10 fill:#ffe6e6
    style Err11 fill:#ffe6e6
```

---

## Progress Tracking Logic

```mermaid
gantt
    title 3D Model Processing Timeline
    dateFormat  X
    axisFormat %s
    
    section Upload
    Create Pothole Record    :0, 5s
    Upload to Kiri Engine    :5s, 15s
    Create Task Tracking     :15s, 20s
    
    section Processing
    Kiri: Upload Complete    :20s, 30s
    Kiri: Frame Extraction   :30s, 90s
    Kiri: Point Cloud Gen    :90s, 180s
    Kiri: 3DGS Model Gen     :180s, 300s
    
    section Storage
    Download Model           :300s, 315s
    Upload to Supabase       :315s, 330s
    Update Database          :330s, 335s
    Update Task Status       :335s, 340s
    
    section Display
    Show Success Screen      :340s, 345s
```

---

## System Context Diagram

```mermaid
C4Context
    title System Context - Eyeway 3D Processing Pipeline
    
    Person(user, "User", "Mobile/Web user capturing potholes")
    
    System_Boundary(eyeway, "Eyeway Dashboard") {
        System(webapp, "Web Application", "React/TypeScript SPA")
    }
    
    System_Ext(supabase, "Supabase", "Database + Storage + Auth")
    System_Ext(kiri, "Kiri Engine", "3D Processing API")
    System_Ext(mapbox, "Mapbox", "Geocoding + Maps")
    
    Rel(user, webapp, "Captures video, views results")
    Rel(webapp, supabase, "Stores data, uploads models", "PostgreSQL + Storage")
    Rel(webapp, kiri, "Processes video to 3D", "REST API")
    Rel(webapp, mapbox, "Reverse geocoding", "REST API")
    
    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

---

*These diagrams can be rendered using Mermaid-compatible tools like:*
- *GitHub (auto-renders in .md files)*
- *Mermaid Live Editor (https://mermaid.live)*
- *VS Code Mermaid Extension*
- *Notion, Obsidian, etc.*

---

*Last Updated: October 14, 2025*

