# adapt-kineo-xAPI
An extension to utilise [The Experience API (xAPI)](https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#parttwo), to collect data on human performance, stored within a suitable Learning Record Store (LRS).

Note: This plugin follows some principles from [cmi5](https://github.com/AICC/CMI-5_Spec_Current/blob/quartz/cmi5_spec.md), but does not fully support the cmi5 specification.

## Configuration
Please refer to [example.json](example.json) for the JSON snippet which should be added to _config.json_.

| Property | Type | Default | Description |
|--|--|--|--|
| \_isEnabled | Boolean | `true` | Enables the xAPI extension.
| \_isRestoreEnabled | Boolean | `false` | If `true`, retrieves Adapt state data from the LRS to restore learner progress.
| \_isDebugModeEnabled | Boolean | `false` | If enabled, statements appear in the console instead of being sent to the LRS.
| \_activityId | String | `""` | Specifies the Activity ID in tincan.xml for xAPI tracking. This value may be overridden in a hosted environment.
| \_revision | String | `""` | If blank, this field auto-populates using the plugin’s `package.json` version number.
| \_contentRelease | String | `0.0.0` | Identifies the version of the content. Increment this when releasing new builds.
| \_tracking | Object | `{ _storeQuestionResponses: true, _questionInteractions: true, _assessmentsCompletion: false, _assessmentCompletion: true, "_focusedStates": true, "_navbar": true, "_video": true, "_visua11y": true, "_connectionErrors": true, "_inactivityTimout": true }` | <ul><li>\_storeQuestionResponses: Sends a completed statement for each individual assessment.</li><li>\_questionInteractions: Tracks learner interactions with questions.</li><li>\_assessmentsCompletion: Sends a completed statement when all assessments are completed.</li><li>\_assessmentCompletion: Sends a completed statement when all assessments are completed.</li><li>\_focusedStates: Tracks when the course is visible or hidden in the browser.</li><li>\_navbar_: Tracks clicks on Adapt’s navigation bar.</li><li>\_video_: Tracks interactions with adapt-contrib-media throughout the course. Requires adapt-mediaAnalytics to function.</li><li>\_visua11y_: Logs accessibility settings changes made via [Visua11y's](https://github.com/cgkineo/adapt-visua11y) settings</li><li>\_connectionErrors_: Logs LMS connection issues reported by adapt-contrib-spoor</li><li>\_inactivityTimeout_: Tracks inactivity warnings triggered by adapt-kineo-inactivityPopup.</li></ul>
| \_errors | Object | See [example.json](example.json) | The `title` and `body` content to be displayed to the user in the event that data cannot be sent to the LRS. `_isCancellable: false` can be used to prevent the user from closing the error and proceeding with the course (requires fix for https://github.com/adaptlearning/adapt_framework/issues/2743).<br><br>The types of errors are as follows:<ul><li>\_launch: For errors associated with a failed launch when connecting to the LRS.</li><li>\_lrs: For errors associated with failed communication to the LRS when using the Statement or State API.</li><li>\_activityId: Error to indicate the Activity id is missing and data will not be tracked.</li></ul>

## Launch types
The plugin currently supports the [ADL xAPI Launch](https://github.com/adlnet/xapi-launch) and [Rustici launch](https://github.com/RusticiSoftware/launch/blob/master/lms_lrs.md#launch) methods. The ADL xAPI Launch method is recommended for the secure transmission of data, as the Launch Server acts as a proxy between Adapt and the LRS, so the content doesn't connect or use any credentials for the LRS directly.

For security reasons, the plugin does not support hardcoded LRS authentication credentials via _config.json_.

For testing purposes, depending on the launch method, the ADL Launch Server credentials can be included in [adl_launch.html](required/adl_launch.html), or the LRS authentication credentials can be included in [launch.html](required/launch.html). ***It is strongly recommended to remove these files for any course deliveries.***

## Recipe
A recipe is a standard way of expressing a particular type of action in a recorded statement. There are many ways of expressing the same action, so without a recipe, it can cause issues when analysing the data as there is no consistency in how that action is expressed.

The granular detail of what is included within each statement and how to analyse that data, is not covered in this readme. At a high-level, the plugin uses the following registered activity types and verbs:

### Activity types
| id | Description |
|--|--|
| http://adlnet.gov/expapi/activities/course | Defines the course model.
| http://adlnet.gov/expapi/verbs/module | Defines a module or content page.
| http://adlnet.gov/expapi/activities/interaction | Represents an interactive component.
| http://adlnet.gov/expapi/verbs/cmi.interaction | Represents a question component.
| http://adlnet.gov/expapi/activities/assessment | Represents an assessment.
| http://id.tincanapi.com/activitytype/resource | Represents a downloadable or external course resource.
| http://adlnet.gov/expapi/activities/profile | Represents a learner profile settings.
| https://w3id.org/xapi/video/activity-type/video | Activity definition for the xAPI Video Profile
| http://id.tincanapi.com/activitytype/vocabulary-word | Activity definition for a glossary term.


### Verbs
| Verb | id | Description |
|--|--|--|
| initialized | http://adlnet.gov/expapi/verbs/initialized | Sent once the course has been launched, to indicate the start of the session.
| terminated | http://adlnet.gov/expapi/verbs/terminated | Sent once the course has been closed, to indicate the end of a session.
| preferred | http://adlnet.gov/expapi/verbs/preferred | Sent to indicate a user’s language or profile preferences.
| completed | http://adlnet.gov/expapi/verbs/completed | Sent once an activity within the course has been completed. As default, restricted to course and page models. Component completion can be enabled as required for each model in _components.json_ via `_recordCompletion: true`.
| experienced | http://adlnet.gov/expapi/verbs/experienced | Sent each time a user leaves a page.
| interacted | http://activitystrea.ms/schema/1.0/interact | Sent whenver a learner interacts with a UI element.
| received | http://activitystrea.ms/schema/1.0/receive | Sent once the learner is alerted to issues pertaining to the saving of data.
| answered | http://adlnet.gov/expapi/verbs/answered | Sent each time a question component has been answered.
| passed | http://adlnet.gov/expapi/verbs/passed | Sent should a user achieve the required passmark for an assessment.
| failed | http://adlnet.gov/expapi/verbs/failed | Sent should a user score below the required passmark for an assessment.
| accessed | https://activitystrea.ms/schema/1.0/access | Sent once a learner selects a link to a file, website, etc.
| failed | http://id.tincanapi.com/verb/viewed | Sent once a learner has viewed a piece of content.
| focused | http://id.tincanapi.com/verb/focused | Sent when the course window gains focus.
| unfocused | http://id.tincanapi.com/verb/unfocused | Sent when the course window loses focus.

### xAPI Video Profile Verbs
| Verb | id | Description |
|--|--|--|
| completed | https://w3id.org/xapi/video/verbs/completed | Sent once a learner viewed every segment of a piece of media.
| interacted | https://w3id.org/xapi/video/verbs/interacted | Sent once a learner interacts with elements of a media player.
| paused | https://w3id.org/xapi/video/verbs/paused | Sent once a learner pauses a media player.
| played | https://w3id.org/xapi/video/verbs/played | Sent once a learner plays or resumes a media player.
| seeked | https://w3id.org/xapi/video/verbs/seeked | Sent once a learner attempts to move to a different time point within the media player.

## Limitations
- Does not support multiple endpoints for storing data to more than one LRS.
- Does not currently work alongside [adapt-contrib-spoor](https://github.com/adaptlearning/adapt-contrib-spoor) due to a conflict with `Adapt.offlineStorage`. 
