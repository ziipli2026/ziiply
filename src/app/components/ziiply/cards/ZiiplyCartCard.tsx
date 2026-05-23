{/* PROGRESS BADGE */}

<div
  style={{
    width: 88,
    height: 88,
    minWidth: 88,
    minHeight: 88,

    borderRadius: 24,

    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",

    background: "#00e05a",
    color: "#001b08",

    fontWeight: 900,
    lineHeight: 1,

    flexShrink: 0,

    boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
  }}
>
  <div
    style={{
      fontSize: 24,
      marginBottom: 2,
    }}
  >
    {progress}
  </div>

  <div
    style={{
      fontSize: 18,
    }}
  >
    %
  </div>
</div>
