# adapt-xAPI

**adapt-xAPI** is an extension that enables tracking of learner activity using [The Experience API (xAPI)](https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#parttwo). Data is collected on human performance and stored within a suitable Learning Record Store (LRS).

Whilst the recipe used in this plugin is influenced by [cmi5](https://github.com/AICC/CMI-5_Spec_Current/blob/quartz/cmi5_spec.md), this profile is not currently supported.

## Installation

With the [Adapt CLI](https://github.com/adaptlearning/adapt-cli) installed, run the following from the command line:
```
adapt install adapt-xAPI
```

Alternatively, this extension can also be installed by adding the following line to adapt.json:
```json
"adapt-xAPI": "*"
```
Then running the command:
```
adapt install
```
(This second method will reinstall all plug-ins listed in adapt.json.)

## Settings Overview

The attributes listed below are used in _config.json_ to configure **adapt-xAPI**, and are properly formatted as JSON in [example.json](https://github.com/cgkineo/adapt-xAPI/blob/master/example.json).

### Attributes

**\_isEnabled** (boolean): Turns on and off the extension. Can be set to disable **adapt-xAPI** when not required. The default value is `true`.

**\_activityId** (string): Used to populate the Activity ID included in _tincan.xml_ and for use in the Statement and State API. The value will be overridden if changed on the hosting environment.

**\_revision** (string): This helps identify users running particular versions of the content, should functionality have been changed or issues found which require updates/voided statements for users running a specific revision. Where data has changed significantly, a new Activity ID is recommended. The default value is `""`.

**\_isRestoreEnabled** (boolean): If enabled, the course will attempt to restore learner progress from the LRS using the State API. The default value is `true`.

**\_isDebugModeEnabled** (boolean): If enabled, the course will log detailed xAPI debug information to the console. The default value is `false`.

**\_tracking** (object): Contains settings for tracking different types of interactions.

>**\_storeQuestionResponses** (boolean): If enabled, the course will restore question responses across browser sessions. The default value is `true`.

>**\_questionInteractions** (boolean): If enabled, the course will send statements recording the user's question responses. The default value is `true`.

>**\_assessmentsCompletion** (boolean): If enabled, the course will send a statement for each assessment that is completed. Recommended only for courses containing multiple assessments. The default value is `false`.

>**\_assessmentCompletion** (boolean): If enabled, the course will send a statement when all assessments have been completed. The default value is `true`.

>**\_navbar** (boolean): If enabled, the course will send statements when navigation buttons are clicked. The default value is `false`.

>**\_visua11y** (boolean): If enabled, the course will send statements for Visua11y accessibility interactions. The default value is `false`.

>**\_connectionErrors** (boolean): If enabled, the course will send statements when LRS connection errors occur. The default value is `false`.

>**\_inactivityTimout** (boolean): If enabled, the course will send statements when user inactivity timeout is detected. The default value is `false`.

**\_offlineQueue** (object): Configure offline queueing for unreliable network connections.

>**\_isEnabled** (boolean): If enabled, statements will be queued and retried when network connectivity is unreliable. The default value is `false`.

>**\_threshold** (number): Maximum number of statements to queue before triggering batch flush. The default value is `10`.

>**\_timeout** (number): How long to wait for LRS response before timing out (in milliseconds). The default value is `5000`.

>**\_maxRetries** (number): How many times to retry failed statements before giving up. The default value is `3`.

>**\_retryDelay** (number): How long to wait before retrying failed statements (in milliseconds). The default value is `2000`.

**\_errors** (object): Contains error notification configurations for different failure scenarios.

>**\_launch** (object): Configuration for errors associated with a failed launch when connecting to the LRS.

>>**title** (string): The title to display in the error notification. The default value is `"xAPI could not be initialized"`.

>>**body** (string): The body text to display in the error notification. The default value is `"This activity will not be tracked."`.

>>**\_classes** (string): List any CSS classes to attach to the notification pop-up. The default value is `""`.

>>**\_isCancellable** (boolean): If enabled, the user can close the notification and continue with an untracked session. The default value is `true`.

>**\_lrs** (object): Configuration for errors associated with failed communication to the LRS when using the Statement or State API.

>>**title** (string): The title to display in the error notification. The default value is `"LRS could not be found"`.

>>**body** (string): The body text to display in the error notification. The default value is `"There was a problem communicating with the LRS. Tracking data may be lost if you continue with this session."`.

>>**\_classes** (string): List any CSS classes to attach to the notification pop-up. The default value is `""`.

>>**\_isCancellable** (boolean): If enabled, the user can close the notification and continue with an untracked session. The default value is `true`.

>**\_activityId** (object): Configuration for errors when the Activity ID is missing.

>>**title** (string): The title to display in the error notification. The default value is `"Missing Activity IRI"`.

>>**body** (string): The body text to display in the error notification. The default value is `"An Activity id has not been set. This activity will not be tracked."`.

>>**\_classes** (string): List any CSS classes to attach to the notification pop-up. The default value is `""`.

>>**\_isCancellable** (boolean): If enabled, the user can close the notification and continue with an untracked session. The default value is `true`.

## Launch Types

The plugin currently supports the [ADL xAPI Launch](https://github.com/adlnet/xapi-launch) and [Rustici launch](https://github.com/RusticiSoftware/launch/blob/master/lms_lrs.md#launch) methods. The ADL xAPI Launch method is recommended for the secure transmission of data, as the Launch Server acts as a proxy between Adapt and the LRS, so the content doesn't connect or use any credentials for the LRS directly.

For security reasons, the plugin does not support hardcoded LRS authentication credentials via _config.json_.

For testing purposes, depending on the launch method, the ADL Launch Server credentials can be included in [adl_launch.html](required/adl_launch.html), or the LRS authentication credentials can be included in [launch.html](required/launch.html). **It is strongly recommended to remove these files for any course deliveries.**

## Offline Queue

The offline queue feature provides robust handling for unreliable network connections. When enabled, xAPI statements are intelligently queued and retried rather than being lost due to connectivity issues.

### Features

- **Automatic Retry Logic**: Failed statements are automatically retried with configurable delays and maximum attempts
- **Batch Flushing**: Statements are batched and sent together when the queue reaches a configurable threshold
- **Timeout Handling**: Network requests timeout gracefully using AbortController to prevent hung requests
- **Keepalive Support**: Critical statements (like termination) use keepalive to ensure delivery even when the page is closing
- **Debug Logging**: Detailed console logging when debug mode is enabled

### Configuration

Enable the offline queue in _config.json_:

```json
"_offlineQueue": {
  "_isEnabled": true,
  "_threshold": 10,
  "_timeout": 5000,
  "_maxRetries": 3,
  "_retryDelay": 2000
}
```

The queue will automatically handle network interruptions, retrying failed statements in the background while allowing the learner to continue their session uninterrupted.

## Recipe

A recipe is a standard way of expressing a particular type of action in a recorded statement. There are many ways of expressing the same action, so without a recipe, it can cause issues when analyzing the data as there is no consistency in how that action is expressed.

The granular detail of what is included within each statement and how to analyze that data is not covered in this readme. At a high level, the plugin uses the following registered activity types and verbs:

### Activity Types

| ID | Description |
|--|--|
| `http://adlnet.gov/expapi/activities/course` | Defines the course model. |
| `http://adlnet.gov/expapi/activities/module` | Defines a content page model. |
| `http://adlnet.gov/expapi/activities/interaction` | Defines a component model. |
| `http://adlnet.gov/expapi/activities/cmi.interaction` | Defines a question component model. |
| `http://adlnet.gov/expapi/activities/assessment` | Defines an assessment article model and/or the overall assessment. |

### Verbs

| Verb | ID | Description |
|--|--|--|
| initialized | `http://adlnet.gov/expapi/verbs/initialized` | Sent once the course has been launched, to indicate the start of the session. |
| terminated | `http://adlnet.gov/expapi/verbs/terminated` | Sent once the course has been closed, to indicate the end of a session. |
| preferred | `http://adlnet.gov/expapi/verbs/preferred` | Sent to indicate a user's language preference. |
| completed | `http://adlnet.gov/expapi/verbs/completed` | Sent once an activity within the course has been completed. By default, restricted to course and page models. Component completion can be enabled as required for each model in _components.json_ via `_recordCompletion: true`. |
| experienced | `http://adlnet.gov/expapi/verbs/experienced` | Sent each time a user leaves a page. |
| answered | `http://adlnet.gov/expapi/verbs/answered` | Sent each time a question component has been answered. |
| passed | `http://adlnet.gov/expapi/verbs/passed` | Sent should a user achieve the required passmark for an assessment. |
| failed | `http://adlnet.gov/expapi/verbs/failed` | Sent should a user score below the required passmark for an assessment. |

## Limitations and Known Issues

- Does not support multiple endpoints for storing data to more than one LRS.
- Does not currently work alongside [adapt-contrib-spoor](https://github.com/adaptlearning/adapt-contrib-spoor) due to a conflict with `Adapt.offlineStorage`.

----------------------------
<a href="https://www.kineo.com/"><img src="https://github.com/cgkineo/assets/blob/master/logos/kineo-logo.png" alt="Kineo" align="right"></a><br>
**Version number:**  5.0.0<br>
**Framework versions:**  5.5+<br>
**Author / maintainer:** Kineo<br>
**Accessibility support:** WAI AA<br>
**RTL support:** Yes<br>
**Cross-platform coverage:** Chrome, Edge, Firefox, Safari
