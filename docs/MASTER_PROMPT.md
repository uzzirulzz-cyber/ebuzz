# PLAYBEAT TV — Master Prompt

**Project:** PlayBeatTV.buzz — production build at [github.com/uzzirulzz-cyber/ebuzz](https://github.com/uzzirulzz-cyber/ebuzz)
**Scope:** Channel and content category structure for the PlayBeatTV.buzz master prompt, including Indian, Pakistani, sports, and global entertainment channels.
**Created:** 2026-10-13

> **Governing rule for every count in this document:** the category counts provided
> are treated as **current catalog targets, not verified live channel availability**.

---

## 1. Live TV and Content Categories

Create a dynamic channel directory for PlayBeatTV.buzz with category counts, language labels, country filters, search, channel logos, and live playback status.

### Initial Catalog Categories

- **Documentaries (EN) — 3** (initial catalog target, not verified live availability)
- **Movies — 26** (initial catalog target, not verified live availability)
- **Music (EN) — 3** (initial catalog target, not verified live availability)
- **News (AR) — 9** (initial catalog target, not verified live availability)

Display these counts dynamically based on published catalog records. EN means English and AR means Arabic. Do not hardcode counts after content is added or removed.

### India

Create an India category featuring authorized channels and content:

- Indian news channels
- Bollywood movies
- Indian music and music videos
- Hindi entertainment
- Regional-language entertainment
- Documentaries
- Indian sports coverage where licensed
- Indian TV shows and series

Language filters: Hindi, English, Tamil, Telugu, Bengali, Punjabi, Malayalam, Kannada, and other supported languages.

### Pakistan

Create a Pakistan category featuring authorized channels and content:

- Pakistani news channels
- Urdu entertainment
- Pakistani dramas and series
- Pakistani movies
- Music and cultural programming
- Documentaries
- Cricket and other sports where licensed
- Regional-language programming

Language filters: Urdu, English, Punjabi, Pashto, Sindhi, Balochi, and other supported languages.

### Sports

Create a dedicated sports hub with:

- Cricket
- Football
- Hockey
- Tennis
- Basketball
- Motorsport
- Wrestling
- Combat sports
- International tournaments
- Sports news and analysis
- Highlights and sports documentaries

Include live event cards, event schedules, match status, competition information, team pages, and authorized live broadcasts.

Clearly distinguish live events from upcoming fixtures, completed events, and on-demand highlights. Do not invent scores, fixtures, or live-stream availability.

### Global Channels

Create a worldwide channel directory organized by region:

- South Asia
- Middle East
- Europe
- North America
- Africa
- East Asia
- Southeast Asia
- Latin America
- International

Support country, language, genre, and availability filters. Allow users to discover news, movies, documentaries, music, sports, kids' programming, and general entertainment from around the world.

## 2. Channel Cards and Playback

Every channel card must contain:

- Channel logo
- Channel name
- Country flag or country label
- Language
- Category
- LIVE or OFFLINE status based on verified health checks
- Watch button
- Favorite option

When a user selects a channel, open a dedicated player page containing the channel stream, current program, next program when EPG data exists, related channels, and playback controls.

Support compatible HLS and MPEG-DASH streams using authorized sources. Handle unavailable streams gracefully and provide retry controls.

## 3. Dynamic Admin Channel Manager

Add the following fields to the administration panel:

- Channel name
- Unique channel ID
- Category and subcategory
- Country and region
- Language
- Logo and thumbnail
- Authorized stream URL or protected playback reference
- Streaming format
- EPG source and program schedule
- Publication status
- Stream health status
- Featured channel toggle
- Subscription requirement
- Content rights and availability region
- Start and end dates for licensing where applicable

Allow administrators to create categories, update channel information, import permitted channel metadata, test playback, and manage publication status.

Only mark a channel LIVE when its stream is actually verified as available. A valid stream URL does not itself establish broadcasting rights.

## 4. Homepage Integration

Create the following homepage sections in this order:

1. Featured Entertainment
2. Live Now
3. Pakistan
4. India
5. Sports
6. Global Channels
7. Movies — 26 initial catalog target (not verified live availability)
8. Documentaries (EN) — 3 initial catalog target (not verified live availability)
9. Music (EN) — 3 initial catalog target (not verified live availability)
10. News (AR) — 9 initial catalog target (not verified live availability)
11. Continue Watching
12. Recently Added
13. Recommended for You

Allow the administrator to reorder and configure each section from the backend.

## 5. Final Requirement

Implement all categories as database-driven modules, with working navigation, filters, content management, responsive channel grids, and playback integration. Do not populate the production catalog with invented channel URLs or unauthorized streams. Use licensed providers, official distribution feeds, or content supplied by rights holders, and clearly distinguish catalog entries from verified playable channels.

Suggested main navigation: Home · Live TV · Pakistan · India · Sports · Global · Movies · Series · Documentaries · Music · News.
