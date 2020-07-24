# adapt-xapi
An extension to utilise [The Experience API (xAPI)](https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#parttwo), to collect data on human performance, stored within a suitable Learning Record Store (LRS).

Whilst the recipe used in this plugin is influenced by [cmi5](https://github.com/AICC/CMI-5_Spec_Current/blob/quartz/cmi5_spec.md), this profile is not currently supported.

## Configuration
Please refer to [example.json](example.json) for the JSON snippet which should be added to _config.json_.

| Property | Type | Default | Description |
|--|--|--|--|
| \_isEnabled | Boolean | `false` | Set to `true` to enable the extension.
| \_activityId | String | `""` | Used to populate the Activity id included in _tincan.xml_ and for use in the Statement and State API. The value will be overriden if changed on the hosting environment.
| \_revision | String | `""` | This helps identify users running particular versions of the content, should functionality have been changed or issues found which require updates/voided statements for users running a specific revision. Where data has changed significantly, a new Activity id is recommended.
| \_tracking | Object | `{ _storeQuestionResponses: true, _questionInteractions: true, _assessmentsCompletion: false, _assessmentCompletion: true }` | <ul><li>\_storeQuestionResponses: Restore question responses across browser sessions.</li><li>\_questionInteractions: Record statements for questions.</li><li>\_assessmentsCompletion: Record a completed statement on completion of individual assessments.</li><li>\_assessmentCompletion: Record a completed statement on completion of all assessments combined.</li></ul>
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
| http://adlnet.gov/expapi/verbs/module | Defines a content page model.
| http://adlnet.gov/expapi/activities/interaction | Defines a component model.
| http://adlnet.gov/expapi/verbs/cmi.interaction | Defines a question component model.
| http://adlnet.gov/expapi/activities/assessment | Defines an assessment article model and/or the overall assessment.

### Verbs
| Verb | id | Description |
|--|--|--|
| initialized | http://adlnet.gov/expapi/verbs/initialized | Sent once the course has been launched, to indicate the start of the session.
| terminated | http://adlnet.gov/expapi/verbs/terminated | Sent once the course has been closed, to indicate the end of a session.
| preferred | http://adlnet.gov/expapi/verbs/preferred | Sent to indicate a user’s language preference.
| completed | http://adlnet.gov/expapi/verbs/completed | Sent once an activity within the course has been completed. As default, restricted to course and page models. Component completion can be enabled as required for each model in _components.json_ via `_recordCompletion: true`.
| experienced | http://adlnet.gov/expapi/verbs/experienced | Sent each time a user leaves a page.
| answered | http://adlnet.gov/expapi/verbs/answered | Sent each time a question component has been answered.
| passed | http://adlnet.gov/expapi/verbs/passed | Sent should a user achieve the required passmark for an assessment.
| failed | http://adlnet.gov/expapi/verbs/failed | Sent should a user score below the required passmark for an assessment.

## Limitations
- Does not support multiple endpoints for storing data to more than one LRS.
- Does not currently work alongside [adapt-contrib-spoor](https://github.com/adaptlearning/adapt-contrib-spoor) due to a conflict with `Adapt.offlineStorage`.