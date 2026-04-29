# Decisions Log

| Date       | Decision                                              | Why                                                                            | Consequence                                         |
| ---------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------- |
| 2026-04-29 | Use EAS Build for APK automation                      | Local Android/Gradle setup and network constraints made manual flow unreliable | CI pipeline becomes main APK generation path        |
| 2026-04-29 | Add android.package to app config                     | Required for EAS non-interactive builds                                        | Eliminates non-interactive build blocker            |
| 2026-04-29 | Introduce multi-agent workflow                        | Need specialization for planning, coding, QA, review, release                  | Faster and clearer development lifecycle            |
| 2026-04-29 | Use plan files under .github/plans as contract        | Agents are stateless across sessions                                           | Enables Planner -> Builder continuity               |
| 2026-04-29 | Create ContextKeeper and .github/context memory files | Need persistent strategic context and guidance                                 | Continuity across chats and better roadmap steering |
