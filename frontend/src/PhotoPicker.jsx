import { useState, useRef, useCallback } from "react";

// ── PhotoPicker — click to select, drag to crop, confirm to set ──
export default function PhotoPicker({ currentPhoto, name, onSave, onCancel }) {
  const [stage, setStage]       = useState("idle"); // idle | preview | crop
  const [rawSrc, setRawSrc]     = useState(null);
  const [cropPos, setCropPos]   = useState({ x: 0, y: 0 });
  const [cropSize, setCropSize] = useState(200);
  const [imgSize, setImgSize]   = useState({ w: 1, h: 1 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [posStart, setPosStart]   = useState(null);
  const fileRef  = useRef();
  const imgRef   = useRef();
  const canvasRef = useRef();

  // ── Pick file ────────────────────────────────────────────────
  const pickFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawSrc(ev.target.result);
      setStage("preview");
    };
    reader.readAsDataURL(file);
  };

  // ── When image loads, init crop centered ────────────────────
  const onImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.clientWidth;
    const h = img.clientHeight;
    setImgSize({ w, h });
    const size = Math.min(w, h, 220);
    setCropSize(size);
    setCropPos({ x: (w - size) / 2, y: (h - size) / 2 });
  };

  // ── Drag crop box ────────────────────────────────────────────
  const onMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPosStart({ ...cropPos });
  };

  const onMouseMove = useCallback((e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const newX = Math.max(0, Math.min(imgSize.w - cropSize, posStart.x + dx));
    const newY = Math.max(0, Math.min(imgSize.h - cropSize, posStart.y + dy));
    setCropPos({ x: newX, y: newY });
  }, [dragging, dragStart, posStart, imgSize, cropSize]);

  const onMouseUp = () => setDragging(false);

  // Touch support
  const onTouchStart = (e) => {
    const t = e.touches[0];
    setDragging(true);
    setDragStart({ x: t.clientX, y: t.clientY });
    setPosStart({ ...cropPos });
  };
  const onTouchMove = (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    const dx = t.clientX - dragStart.x;
    const dy = t.clientY - dragStart.y;
    const newX = Math.max(0, Math.min(imgSize.w - cropSize, posStart.x + dx));
    const newY = Math.max(0, Math.min(imgSize.h - cropSize, posStart.y + dy));
    setCropPos({ x: newX, y: newY });
  };

  // ── Crop and export ──────────────────────────────────────────
  const confirmCrop = () => {
    const img = imgRef.current;
    if (!img) return;
    const canvas = canvasRef.current || document.createElement("canvas");
    const OUTPUT = 240;
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");

    // Scale from display pixels to natural image pixels
    const scaleX = img.naturalWidth  / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;

    ctx.drawImage(
      img,
      cropPos.x * scaleX, cropPos.y * scaleY,
      cropSize  * scaleX, cropSize  * scaleY,
      0, 0, OUTPUT, OUTPUT
    );

    // Circular clip for preview only (saved as square for ATS compat)
    const result = canvas.toDataURL("image/jpeg", 0.82);
    onSave(result);
  };

  // ── Initials avatar fallback ─────────────────────────────────
  const initials = (name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const overlay = {
  position: "fixed", inset: 0,
  background: "rgba(0,0,0,0.88)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 99999, padding: 16,
};
  const box = {
    background: "#0c1220", border: "1px solid #1e293b",
    borderRadius: 20, padding: "28px 28px 22px",
    width: "100%", maxWidth: 420,
    boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
  };
  const btnBase = {
    padding: "10px 22px", borderRadius: 8,
    fontWeight: 700, fontSize: 13, cursor: "pointer", border: "none",
  };

  return (
    <div style={overlay} onClick={stage === "idle" ? onCancel : undefined}>
      <div style={box} onClick={e => e.stopPropagation()}>

        {/* ── IDLE: show current photo + upload prompt ── */}
        {stage === "idle" && (
          <>
            <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 800, color: "#f1f5f9" }}>
              📷 Profile Photo
            </h3>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
              {/* Current photo preview */}
              <div style={{ position: "relative" }}>
                {currentPhoto
                  ? <img src={currentPhoto} alt="current" style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: "3px solid #4f46e5" }} />
                  : <div style={{ width: 120, height: 120, borderRadius: "50%", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, fontWeight: 800, color: "#fff", border: "3px solid #4f46e5" }}>{initials}</div>
                }
              </div>

              {/* Upload zone */}
              <div
                onClick={() => fileRef.current.click()}
                style={{ width: "100%", border: "2px dashed #334155", borderRadius: 12, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: "#0f172a", transition: "border-color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#4f46e5"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#334155"}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}></div>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Click to choose photo</p>
                <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>JPG, PNG, WEBP — max 5MB</p>
              </div>

              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={pickFile} />

              <div style={{ display: "flex", gap: 10, width: "100%" }}>
                <button onClick={onCancel} style={{ ...btnBase, flex: 1, background: "#1e293b", color: "#94a3b8", border: "1px solid #334155" }}>Cancel</button>
                {currentPhoto && (
                  <button onClick={() => onSave("")} style={{ ...btnBase, flex: 1, background: "#7f1d1d44", color: "#f87171", border: "1px solid #7f1d1d44" }}>🗑 Remove</button>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── PREVIEW: crop interface ── */}
        {stage === "preview" && rawSrc && (
          <>
            <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#f1f5f9" }}>✂️ Crop Photo</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}>Drag the box to select the area you want</p>

            {/* Crop area */}
            <div
              style={{ position: "relative", display: "inline-block", width: "100%", userSelect: "none", borderRadius: 10, overflow: "hidden" }}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchMove={onTouchMove}
              onTouchEnd={onMouseUp}
            >
              <img
                ref={imgRef}
                src={rawSrc}
                onLoad={onImgLoad}
                draggable={false}
                style={{ width: "100%", display: "block", opacity: 0.45 }}
                alt="crop source"
              />

              {/* Dark overlay with crop hole */}
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                {/* Crop highlight box */}
                <div
                  style={{
                    position: "absolute",
                    left: cropPos.x, top: cropPos.y,
                    width: cropSize, height: cropSize,
                    border: "2px solid #4f46e5",
                    borderRadius: 6,
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                    cursor: "move",
                    pointerEvents: "all",
                    background: "transparent",
                  }}
                  onMouseDown={onMouseDown}
                  onTouchStart={onTouchStart}
                >
                  {/* Corner handles */}
                  {[["0%","0%"],["100%","0%"],["0%","100%"],["100%","100%"]].map(([l, t], i) => (
                    <div key={i} style={{ position: "absolute", left: l, top: t, width: 10, height: 10, background: "#4f46e5", borderRadius: 2, transform: "translate(-50%,-50%)" }} />
                  ))}
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 20, opacity: 0.6 }}>✥</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Crop size slider */}
            <div style={{ margin: "14px 0", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>🔍 Size</span>
              <input type="range" min={80} max={Math.min(imgSize.w, imgSize.h)}
                value={cropSize}
                onChange={e => {
                  const s = Number(e.target.value);
                  setCropSize(s);
                  setCropPos(p => ({
                    x: Math.max(0, Math.min(imgSize.w - s, p.x)),
                    y: Math.max(0, Math.min(imgSize.h - s, p.y)),
                  }));
                }}
                style={{ flex: 1, accentColor: "#4f46e5" }}
              />
            </div>

            <canvas ref={canvasRef} style={{ display: "none" }} />

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setStage("idle"); setRawSrc(null); }}
  style={{ ...btnBase, flex: 1, background: "#ef4444", color: "#fff", border: "none", fontSize: 14 }}>
  ← Back
</button>
              <button onClick={confirmCrop} style={{ ...btnBase, flex: 2, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff" }}>✓ Use This Photo</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}