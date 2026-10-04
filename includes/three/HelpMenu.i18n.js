
// /includes/three/HelpMenu.i18n.js
// i18n for Help-menyen (norsk og engelsk)

const help_no = {
  sections: [
    { key: "basic",     label: "Basic" },
    { key: "align",     label: "Align" },
    { key: "hydro",     label: "Hydro" },
    { key: "tools",     label: "Tools" },
    { key: "render",    label: "Render" },
    { key: "info",      label: "Info" },
    { key: "shortcuts", label: "Snarveier" }
  ],
  content: {
    basic: `
      <h3>Basic</h3>
      <p><b>Mus:</b> venstre-drag = roter, scroll = zoom, høyre-drag = pan.</p>
      <p><b>Fit</b> zoomer inn riktig. <b>Reset</b> går tilbake til sist “fit”.</p>
      <p><b>Zoom+/Zoom−</b> gir presis zoom uten scroll.</p>
    `,
    align: `
      <h3>Align</h3>
      <p><b>Auto (Boat):</b> orienterer skroget: X = lengde, Y = bredde, Z = opp.</p>
      <p>Bruk <b>Swap XY/XZ/YZ</b> for hurtig transponering.</p>
    `,
    hydro: `
      <h3>Hydro</h3>
      <p><b>Vannlinje:</b> alltid i globalt XY-plan.</p>
      <p><b>Draft:</b> flytter WL langs Z. <b>Trim/Heel:</b> roterer modellen, ikke WL.</p>
      <p><b>Deplasement</b> og <b>CB</b> beregnes under WL.</p>
    `,
    tools: `
      <h3>Tools</h3>
      <p><b>Clipping:</b> kutt langs X/Y/Z; “invert” snur siden.</p>
      <p><b>Measure:</b> klikk to punkt. Snapping til vertex/edge.</p>
    `,
    render: `
      <h3>Render</h3>
      <p><b>Wireframe</b> viser triangulering; <b>Edges</b> fremhever kanter.</p>
      <p><b>Smooth/Flat:</b> endrer shading.</p>
      <p><b>Opacity:</b> gjennomsiktighet.</p>
    `,
    info: `
      <h3>Info</h3>
      <p>Mål (ΔX/ΔY/ΔZ), totalvolum, <b>CG</b> og <b>CB</b>.</p>
      <p>Enhetsvalg påvirker alle tall.</p>
    `,
    shortcuts: `
      <h3>Snarveier</h3>
      <p><b>+</b>: zoom inn</p>
      <p><b>-</b>: zoom ut</p>
      <p><b>R</b>: reset view</p>
    `
  }
};

const help_en = {
  sections: [
    { key: "basic",     label: "Basic" },
    { key: "align",     label: "Align" },
    { key: "hydro",     label: "Hydro" },
    { key: "tools",     label: "Tools" },
    { key: "render",    label: "Render" },
    { key: "info",      label: "Info" },
    { key: "shortcuts", label: "Shortcuts" }
  ],
  content: {
    basic: `
      <h3>Basic</h3>
      <p><b>Mouse:</b> left-drag = rotate, wheel = zoom, right-drag = pan.</p>
      <p><b>Fit</b> frames the model. <b>Reset</b> returns to last “fit”.</p>
      <p><b>Zoom+/Zoom−</b> precise zoom without wheel.</p>
    `,
    align: `
      <h3>Align</h3>
      <p><b>Auto (Boat):</b> X = length, Y = beam, Z = up.</p>
      <p>Use <b>Swap XY/XZ/YZ</b> for quick axis transposition.</p>
    `,
    hydro: `
      <h3>Hydro</h3>
      <p><b>Waterline:</b> always global XY plane.</p>
      <p><b>Draft:</b> moves WL along Z. <b>Trim/Heel:</b> rotates model, not WL.</p>
      <p><b>Displacement</b> and <b>CB</b> computed below WL.</p>
    `,
    tools: `
      <h3>Tools</h3>
      <p><b>Clipping:</b> slice along X/Y/Z.</p>
      <p><b>Measure:</b> click two points. Snap to vertex/edge.</p>
    `,
    render: `
      <h3>Render</h3>
      <p><b>Wireframe</b> shows triangulation.</p>
      <p><b>Smooth/Flat:</b> shading mode.</p>
      <p><b>Opacity:</b> transparency.</p>
    `,
    info: `
      <h3>Info</h3>
      <p>Extents (ΔX/ΔY/ΔZ), volume, <b>CG</b>, <b>CB</b>.</p>
    `,
    shortcuts: `
      <h3>Shortcuts</h3>
      <p><b>+</b>: zoom in</p>
      <p><b>-</b>: zoom out</p>
      <p><b>R</b>: reset view</p>
    `
  }
};

export function detectLang() {
  const param = new URLSearchParams(location.search).get("lang");
  if (param) return param.startsWith("en") ? "en" : "no";
  const html = document.documentElement.getAttribute("lang") || "";
  if (html.startsWith("en")) return "en";
  const nav = navigator.language || "no";
  return nav.startsWith("en") ? "en" : "no";
}

export function getHelpData(lang = "no") {
  return lang === "en" ? help_en : help_no;
}
