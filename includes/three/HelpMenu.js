
// HelpMenu.js
export const HelpMenu = {
  basic: `
    <h3>Basic Controls</h3>
    <p><b>Rotate:</b> Left mouse drag</p>
    <p><b>Zoom:</b> Scroll wheel</p>
    <p><b>Pan:</b> Right mouse drag</p>
    <p><b>Fit view:</b> Centers the model</p>
  `,

  align: `
    <h3>Alignment Tools</h3>
    <p>Auto Align analyses the hull and rotates it into:</p>
    <ul>
      <li><b>X-axis → length</b></li>
      <li><b>Y-axis → beam</b></li>
      <li><b>Z-axis → upward</b></li>
    </ul>
  `,

  render: `
    <h3>Rendering Options</h3>
    <p><b>Wireframe</b> shows model triangulation.</p>
    <p><b>Edges</b> highlights sharp features.</p>
    <p><b>Smooth/Flat shading</b> adjusts lighting mode.</p>
  `,

  tools: `
    <h3>Tools</h3>
    <p><b>Clipping:</b> Slice the model by axis.</p>
    <p><b>Measure:</b> Click two points to measure distance.</p>
    <p><b>Snapping:</b> Smart point snapping to edges/vertices.</p>
  `,

  hydro: `
    <h3>Hydrostatics</h3>
    <p><b>Waterline:</b> Flat reference plane.</p>
    <p><b>Draft:</b> Moves WL up/down to calculate displacement.</p>
    <p><b>Trim & Heel:</b> Rotates WL for stability testing.</p>
  `,

  shortcuts: `
    <h3>Keyboard Shortcuts</h3>
    <p><b>+</b> Zoom in</p>
    <p><b>-</b> Zoom out</p>
    <p><b>R</b> Reset view</p>
  `
};

