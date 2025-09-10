# How we manage our work

## Breaking down strategic priorities into tactical work

Linear flow of the phases and how our work is broken down 
- **Discovery research** is conducted to understand problems and user needs 
  - Epics and stories are formed based on insights and trends
- **Scope:** Epics are broken down into specific and actionable user stories
  - Further discovery research is conducted as necessary
  - User stories and spikes are prioritized
  - Options are explored
- **Spike** (optional): Solutions and questions are further explored
  - Design creates wireframes, mockups, or prototypes
  - Engineering reviews docs or creates prototypes
  - Evaluative research is conducted as necessary
- **Design:** Page Layouts, Components, or Iterations have visual assets and functional definitions
  - Eng and Design pair to define the solution (how things could work)
  - Engineering helps break down the solution into engineering tasks
  - Product helps prioritize
- **Engineering:** Page Layouts, Components, or Iterations are being developed
  - Design and Product help answer executional questions or unforeseen use cases
- **Review / Deployment:**
  - Pull requests are created for engineering review - changes deployed to dev sandboxes
  - Branch is merged to our Staging Environment for Design and PO review
  - Staging environment is used for feedback
    - Usability testing is conducted as necessary
  - Product Owners deploy a release to our production environment, beta.weather.gov

## Definition of done
- Research is done when
  - There’s a summary of the problem or opportunity areas
  - Team is read-in and provided feedback
  - Epics and stories are documented and prioritized
- Scope is done when
  - It’s documented (often in a “Design Brief”)
    - Specific and clear user stories that we should build now
    - Open questions or assumptions that need to be clarified
    - Options for solutions with feedback
  - Team is aligned and has provided feedback
  - The work is broken into groups that are similar/should go together and documented as Github Issues and classified as:
    - Scopes for more detailed definition
    - Spikes for prototyping
    - Design or Engineering for delivery
- Spike is done when
  - Documented (in google doc or github issue), including:
    - Problem/Opportunity
    - Solutions have been explored
    - Findings (pros/cons)
  - Team is aligned and has provided feedback
- Design is done when
  - Team has reviewed and is aligned on solution and implementation details
  - Work is documented in github issue(s) for Engineering:
    - User need/story
    - Visual assets are attached
    - Acceptance Criteria
- Engineering is done when
  - Code passes peer review
    - Passes automated tests
    - Passes manual review checklist
  - Feature passes design / UAT review
    - Matches designs
    - User stories have been met
    - Common user scenarios have been tested
  - Feature is accepted by Product Owner

## Managing our backlog

[Our roadmap](weather-gov/projects/2/views/8) identifies and prioritizes Epics over quarters or years.

[Our milestones](weather-gov/weather.gov/milestones?direction=asc&sort=title&state=open) prioritize our Epics and Goals over 4-6 sprints (2-3 months). 
- [Our milestone planning board](weather-gov/projects/2/views/18) sequences design and research work over sprints and helps the team identify dependencies across work streams.

[Our sprint board](weather-gov/projects/2/views/1) prioritizes and tracks our work across the following states:
- **Inbox** - unprioritized and unrefined
- **Next/Later** - identified for later milestones
- **Now** - prioritized for the current milestone
- **Backlog** - prioritized for the next sprint or if there’s time in this sprint
- **To-Do** - refined, prioritized, and assigned for this sprint
- **Blocked** - due to dependency, decision, etc.
- **Doing** - in progress
- **Review** - needs Engineering, Design, PO, or SME review
- **Done**

 Every ticket should have:
 - [Label](weather-gov/weather.gov/labels) for categorizing and filtering our work
   - **Type:** Scope, Flow, Layout, Component, Enhancement, Iteration, Spike, Project, Debt, Bug
   - **Discipline:** Design, Research, Content, Eng, Product, Acq
   - **Special use cases:**
     - ADR automated workflow: ADR, ADR: accepted  
- [Sprint iteration](weather-gov/projects/2/settings/fields/62668677) identified during milestone planning, backlog refinement, or sprint planning
- [Epic](weather-gov/projects/2/settings/fields/69368296) to correlate work to outcome/user value
- Assignee, assigned at Sprint Planning
- [Size](weather-gov/projects/2/settings/fields/69215158) to estimate time/effort (at Sprint Planning by Assignee)
- [Priority](weather-gov/projects/2/settings/fields/67831312) to indicate importance for planning
   - **Milestone** is used to tag work for milestone planning and sequencing
 
We host the following recurring meetings to manage our work and priorities:
- **Milestone Planning** (full team) happens quarterly to discuss priorities, sequences, and risks
- **Backlog Refinement** (PO, Eng and Design Leads) happens every 2 weeks to identify goals, work to do, and gaps
- **Sprint Planning** (full team) happens every 2 weeks to validate goals, assign work and evaluate bandwidth
- **Demo** (full team)

## Demos and Retros

Every sprint we host a demo and retro on Fridays 2-3pm EST.

- 20 min: Demo
  - Open to all NWS employees
  - [Recorded and hosted here](https://drive.google.com/drive/folders/1gHEekLUioC8xlsPgR0ARj4Jh4T6kMe0E) :lock:
- 40 min: Retro – Core Team Only

**The purpose of the demo** is to show research findings, wireframes, or working code. Due to limited time, this is not a space for questions or feedback. Reach out to the Core Team Product Owners, Shad Keene or Corey Pieper.

**The purpose of the retro** is to reflect on the successes and challenges of the past sprint in order to improve team health and delivery.

## Additional Practices

- [Equity Pause](https://docs.google.com/document/d/1cyJzf4860nL-w1lZ7YuFQE3_aeweGyWWxTwS3GogwLk/edit#heading=h.e4wxn9uwoibd) :lock: - a recurring, independent time to pick our heads up from our work in order to discuss how our biases our impacting our work, how our work may perpetuate harm, and how our decisions may be influenced by power dynamics in order to more proactively mitigate these risks.
- [Accessibility Jam](https://docs.google.com/document/d/1yOVmtAUTPzPoKP9i1pyjIhaZ3f_fDOZvjVvO3zvq2E8/edit#heading=h.ih4qwitgy8my) :lock: - a recurring time as part of our sprint ceremonies to manually test our outputs with accessibility tools and standards.
