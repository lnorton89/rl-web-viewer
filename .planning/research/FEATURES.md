# Research: Features

## Table Stakes For This Domain

### Device Access

- Add a camera by LAN IP, username, and password
- Verify model, hardware, and firmware information
- Recover from expired login/session state without manual app restarts

### Live View

- View the current camera feed in a modern browser
- Offer a lower-bandwidth or alternate stream when supported
- Surface connection and codec problems clearly

### PTZ

- Pan, tilt, and zoom the camera
- Stop motion reliably
- Support presets/patrol-related hooks when the camera exposes them

### Configuration

- Read current camera settings
- Edit a safe subset of settings
- Confirm whether writes succeeded and show failures explicitly

### Diagnostics

- Show device/firmware information
- Expose raw errors when an endpoint is unsupported or behaves differently than expected

## Differentiators To Consider Later

- Multi-camera management
- Additional Reolink model support through more adapters
- Playback and recordings browsing
- Alarm/motion configuration and event history
- Preset editing, patrol authoring, and tours
- Remote access beyond the LAN

## Feature Notes For This Project

- The user explicitly wants **live view**, **PTZ**, **settings**, and **config** in v1.
- The user explicitly does **not** need multi-user or WAN access yet.
- The project should stay **modular for future model support**, so capability detection and adapter boundaries are table stakes for the implementation even if only one camera is supported at launch.
