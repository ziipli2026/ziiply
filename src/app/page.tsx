// page_v374_camera_unmirror_patch.tsx
// Korvaa scanner-videoelementin transform desktopissä näin:

<video
  ref={videoRef}
  autoPlay
  playsInline
  muted
  className="
    w-full
    h-full
    object-cover
    scale-x-100
  "
/>

// JOS sinulla on inline-style:
style={{
  transform: "none"
}}

// JA jos käytät responsive logiikkaa:
const isMobile = window.innerWidth < 768

style={{
  transform: isMobile ? "scaleX(-1)" : "none"
}}

// Lisäksi tarkista ettei scanner wrapperissa ole:
scale-x-[-1]
transform: scaleX(-1)

// Poista ne myös.
