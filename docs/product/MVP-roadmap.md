# Weather.gov MVP Roadmap
**The purpose of this document** recommends the minimum viable product (MVP) necessary to deliver a successful end to end experience and begin to fulfill our vision and mission for weather.gov. 

**Vision for weather.gov 2.0**
We envision a future where anyone can understand the impact of impending weather, especially when making decisions to save life and property – every word and every minute matters.

**Mission for the weather.gov 2.0 team**
Rebuild weather.gov to reflect the integrity and care you have for the people you serve.

The roadmap below outlines our Now, Next, and Later priorities for Weather.gov 2.0 based on our strategic recommendations from the path analysis. 
- Now - MVP recommendations
- Next - Expand
- Later - Transition and Migration

## What should you expect from MVP?

### Our focus

**The features below scope out what we believe are the core features** needed to share forecasts and conditions for regular and hazardous weather in a way that anyone can find, understand, and use to take action. This is the first step of getting alignment on MVP. 

A reminder that our focus for MVP will be on simplified weather use cases – postponing fire, marine, aviation, climate, space, water, and tropical for now. 

**A new goal for MVP is to build something that all WFOs could use, not just Nashville.** Nashville will be our partner for testing what we build (from a data and people perspective) however we think it’s realistic that we could meet the basic needs of all locations (and WFOs). Each office will have unique challenges and needs, so we will note and prioritize them as we test this across offices.

### Risks

As we transition from prototyping and begin building MVP, we have greater confidence in our core architecture and have identified some of the fundamental product challenges we will have to resolve, including:

- Integration with disparate applications hosted across the NWS network and data latency 
- A cloud-based architecture and the WOC are both fairly new for NWS
- CI/CD and agile development are new methods for delivery
- The complexity of hazards, how they’re communicated, and the impact on people
- New tools and processes have the potential to create confusion for the public and more work for WFOs

### Timing and rollout

**May 2024 is a milestone, not a deadline or launch date.** Waiting till May to show you and our users the site will create unnecessary risk and inevitable failure. The best method for delivery is continuous and gradual, so we intend to design, develop, and deploy these core features from now until May 2024, and beyond.

As we build, we will inevitably uncover functionality we couldn’t foresee and have to resolve the challenges listed above. The only way to manage this successfully is to keep communication lines open as we prioritize and deliver.

**The MVP for weather.gov 2.0 won’t fulfill everyone’s needs in May 2024.** So rollout will have to be done strategically to get user feedback while managing risk (integrity and effort). There are strategies for doing this, but we should focus on building the site now and then determine how and when to roll it out.

## Now - MVP

![happy path journey map](/docs/img/happy-path-v2.png)

**For MVP**, we will focus on designing and building the following:
- **🟢 Ready:** As a member of the public or a partner (external user), weather.gov MVP must answer the most common questions for a hazard or common weather.
- **🟡 WIP:** As an NWS forecaster, ITO, comms lead (internal user), weather.gov MVP must support the ability to create, update, and manage this information consistently and easily. 
- **🟡 WIP:** As an NWS administrator of the website / part of the website, I am able to manage user permissions, access, configurations, etc.
- **🟡 WIP:** As a partner or ROC, weather.gov MVP should support an end-to-end experience covering a geographic area larger than a single location, e.g. county and state-wide views.

For the future we will also research and scope the following:
- **🟠 Backlog for this phase:** As a member of the public or a partner, I would like proactive notifications.

| ID | Story |
| :----------- | :-------------|
|**E.1** | **As any user (internal and external), I want to know why NWS is the authoritative source for weather information.** |
| 1.1 | … I want to know how NWS serves my priorities |
| 1.2 | … I want to know who creates forecasts and hazards, and how they create them |
| 1.3 | … I want know how they uphold integrity |
|**E.2** | **As a member of the public or a partner, I can find weather information for a specific location.** |
| 2.1 | …I can get to a new weather.gov on the internet |
| 2.2 | … I want to know this is an official NWS and gov website |
| 2.3 | … I want to find a location that I’m interested in the weather for |
| 2.4 | … I want weather.gov to know my location |
|**E.3** | **As a member of the public or a partner, I can understand basic weather information for a specific zip code/area** |
| 3.1 | … I want to understand that the weather information I'm seeing is relevant to my specific location |
| 3.2 | … I want to view current conditions |
| 3.3 | … I want to view short and longer term weather forecasts |
| 3.4 | … I want to read a summary of the weather trends and impact  |
| 3.5 | … I want to understand when the information was last updated so that I know it’s relevant and not stale |
| 3.6 | … I want to know who created the forecast in order to trust that the person is familiar with this location and its unique needs/culture |
| 3.7 | … I want to understand when and where weather is developing according to my location (example developing precipitation in my area) |
| **E.4** | **As a member of the public or a partner, I would like to understand the possibility, severity, and impact of a hazard** |
| 4.1 | As a member of the public who got a hazard alert through their weather app, I want to click a link and see the full WWA hazard |
| 4.2 | … I want to be made aware of any hazards for a specific location |
| 4.3 | … I want to understand at-a-glance what, where, and how bad the threat/impact level of a hazard for a specific location |
| 4.4 | … I would like to know what to expect for the length of the hazard (could be more?) for a specific location |
| 4.5 | … I want to understand the actions or steps I could take to save my life or property at my location |
| 4.6 | … I'd like to know when and where the hazard is in order to see if the hazard is approaching me or near me/specific location |
| **E.5** | **As a member of the public or a partner, I want to view granular weather details** |
| 5.1 | … I want to view an expanded hourly forecast of conditions over the next 72 hours |
| **E.6** | **As a partner, I need a very specific question answered** |
| 6.1 | … I want to know who and how I can reach out to someone when I need to |
| **E.7** | **As a member of the public, I want to share info with others** |
| 7.1 | … I want to share a link to the location page I’m looking at, in any channel |
| 7.2 | … I want to share a link to the hazard’s forecast |
| **E.8** | **As a partner or ROC, I can find and understand weather information and hazards across the area I’m responsible for (county and state)** |
| **R.1** | **As a member of the public or a partner, I want to be proactively notified of important weather and directed to relevant information** |

## Next - Expand core user experience and support unique needs

| Epic | Reasoning |
| :----------- | :-------------|
| Fire, marine, aviation, climate, space, water, and tropical products | Need to research audiences and data types further |
| Extreme or unique weather conditions (long and short-fuse) | Need to research context and data types further |
| Org overlap - multiples WFOs, RFCs, NWS Centers | Need to understand processes further |
| Rural / Coastal / OCONUS | Need to research needs further |
| Unique weather-related events | Need to research further | 

**In addition to the above,** there are specific stories and features that were considered for MVP but deprioritized in order to get a site in production, faster.

## Later - Further enhancement of the site, migration, and transition

| Epic | Reasoning |
| :----------- | :-------------|
| As an end user, I need to be educated on the technical aspects of weather | Need to validate that this is important |
| As a meteorologist or weather expert, I have unique needs the MVP won’t satisfy | Need to research further |
| As a weather researcher, I have unique needs the MVP won’t satisfy | Need to research further |
| As a WFO, there are unique pages that we believe are valuable to our community | Need research, inventory, and analysis |
| As an external user, there are unique pages or products that are important to me | Need research, inventory, and analysis |


