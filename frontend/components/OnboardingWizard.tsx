
/** Horizontal roadmap: one chip per step, visited ones are clickable. */
function StepRail({
  current,
  onJump,
  t,
}: {
  current: number;
  onJump: (index: number) => void;
  t: OT;
}) {
  return (
    <>
      <div className="ob-step-rail">
        <div
          className="row"
          style={{
            gap: "0.25rem",
            justifyContent: "space-between",
            marginBottom: "1.1rem",
          }}
          aria-label="Onboarding progress"
        >
          {ONBOARDING_STEPS.map((step, i) => {
            const done = i < current;
            const active = i === current;
            const reachable = i <= current;

            return (
              <button
                key={step}
                type="button"
                onClick={() => reachable && onJump(i)}
                disabled={!reachable}
                aria-current={active ? "step" : undefined}
                aria-label={
                  t("nav.stepAriaLabel", {
                    num: i + 1,
                    label: t(`steps.${step}.railLabel`),
                  }) + (done ? ` ${t("nav.stepDone")}` : "")
                }
                title={
                  done
                    ? t("nav.backToStep", {
                        title: t(`steps.${step}.title`),
                      })
                    : undefined
                }
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.3rem",
                  background: "none",
                  border: "none",
                  padding: "0.2rem 0",
                  cursor: reachable ? "pointer" : "default",
                  color: active
                    ? ACCENT
                    : done
                      ? "var(--muted)"
                      : "var(--faint)",
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "0.62rem",
                    fontWeight: 600,
                    background:
                      active || done
                        ? "rgba(62, 207, 142, 0.12)"
                        : "transparent",
                    border: `1.5px solid ${
                      active
                        ? ACCENT
                        : done
                          ? "rgba(62, 207, 142, 0.5)"
                          : "var(--border)"
                    }`,
                    transition: "all 0.25s var(--ease)",
                  }}
                >
                  {done ? <IconCheck size={12} stroke={2.5} /> : i + 1}
                </span>

                <span
                  style={{
                    fontSize: "0.6rem",
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    color: active ? ACCENT : "var(--faint)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t(`steps.${step}.railLabel`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="ob-step-counter"
        aria-label={t("nav.stepOf", {
          current: current + 1,
          total: ONBOARDING_STEPS.length,
        })}
      >
        {t("nav.stepOf", {
          current: current + 1,
          total: ONBOARDING_STEPS.length,
        })}
      </div>
    </>
  );
}
