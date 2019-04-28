# dat-xr-scene-ide
Load and edit aframe VR scenes from within WebXR

## Roadmap for editing in VR

- [x] Finish up https://github.com/RangerMauve/xterm-js-shell so I can create high level JavaScript command lines
- [x] Combine it with https://github.com/RangerMauve/websocket-shell-service and https://github.com/RangerMauve/aframe-xterm-component to connect to servers
- [x] Add commands that will let you manipulate the DOM
- [x] Demo to be able to live-edit a VR space by manipulating entity attributes and adding child entities via a terminal
- [ ] Get something set up for loading VR scenes from Dat archives via https://github.com/garbados/dat-gateway/
- [ ] Make it possible to create a VR scene from a template from a scene loaded through the gateway
- [ ] Combine that with the terminal for editing the scene, and save the changes you made from the terminal back into the archive
- [ ] Add command to persist your VR scene to a superpeer like Hashbase or a self-hosted dat-store

That'll be an MVP for creating VR experiences in your browser.

## Adding to an existing scene

```html
<script src="//unpkg.com/xterm@3.12.0/dist/xterm.js"></script>
<script src="//unpkg.com/aframe-xterm-component@1.0.1/aframe-xterm-component.js"></script>
<script src="//unpkg.com/xterm-js-shell@1.1.3/bundle.js"></script>
<script src="https://ranger.mauve.moe/dat-xr-scene-ide//editor-terminal.js"></script>
```

Then hit `Ctrl+Alt+T` to open up the terminal
