export function isPublicTeamRosterEnabled(): boolean {
  return process.env.PUBLIC_TEAM_ROSTER === "true";
}
