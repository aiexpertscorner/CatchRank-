# CatchRank Session Module Blueprint

## 1. Product Positioning
Sessions are the "glue" of CatchRank. While a `Catch` is a single event, a `Session` is the story of a fishing trip. It connects multiple catches, different spots, the gear used, and the friends you fished with. It's the primary way users track their "fishing effort" (time on water) vs "fishing success" (catches).

## 2. Live vs. Retro Sessions
- **Live Session**: Started at the waterkant. Real-time duration tracking. Active status in header. Automatic weather snapshots. Immediate catch logging within the session context.
- **Retro Session**: Logged after the trip. Manual start/end time entry. Retrospective weather data (if available). Used for maintaining a complete history when live logging wasn't possible.

## 3. Main Use Cases
- "I'm going fishing now" (Live)
- "I just got back from a 4-hour session" (Retro)
- "I fished with a friend and we want to share the session" (Collaborative)
- "I want to see how my gear performed over a whole day" (Analytics)

## 4. Main Flows
- **Start Live Session**: Quick setup (Location, Method, Gear) -> Go Live.
- **Live Dashboard**: Timer, current weather, quick catch button, spot switcher, gear overview.
- **Add Catch**: Catch form is pre-filled with session data (location, weather, gear).
- **Switch Spot**: Log a location change within the same session.
- **Add Friends**: Invite others to the session (they get a draft to accept).
- **End Session**: Summary of catches, total XP, final notes -> Save.
- **Retro Entry**: Full form with start/end times and manual data entry.

## 5. Integrations
- **Catches**: Every catch in a session is linked.
- **Spots**: A session can span multiple spots.
- **Weather**: Real-time updates during live sessions.
- **Mijn Visgear**: Select setups used for the session.
- **Productfeed**: Suggested gear or "missing items" for the current conditions.
- **Users/Friends**: Shared sessions and competitive rankings.

## 6. Roadmap
- **MVP**: Live/Retro basic logging, single spot, catch linking, basic weather.
- **Phase 2**: Multi-spot support, gear integration (Mijn Visgear), friend tagging.
- **Phase 3**: Live sharing, advanced analytics (success rate per hour/spot), product recommendations.
