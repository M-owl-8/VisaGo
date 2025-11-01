import org.gradle.api.Plugin
import org.gradle.api.Project

class ExpoFixPlugin implements Plugin<Project> {
    void apply(Project project) {
        if (project == project.rootProject) {
            println("⚙️  Applying ExpoFixPlugin to root project...")
            
            // Configure all subprojects
            project.subprojects { subproject ->
                subproject.beforeEvaluate {
                    fixExpoModule(subproject)
                }
                
                subproject.afterEvaluate {
                    fixExpoModule(subproject)
                }
            }
            
            // Also fix at the very end
            project.gradle.projectsEvaluated {
                project.allprojects { p ->
                    fixExpoModule(p)
                }
            }
        }
    }
    
    static void fixExpoModule(Project project) {
        if (project.hasProperty('android')) {
            def android = project.android
            def projectName = project.name
            
            // List of Expo and related modules
            def expoModules = [
                'expo', 'expo-modules-core', 'expo-application', 'expo-constants',
                'expo-file-system', 'expo-font', 'expo-keep-awake', 'expo-blur',
                'expo-camera', 'react-native'
            ]
            
            // Apply fixes only to known problematic modules
            if (projectName in expoModules || projectName.contains('expo') || projectName == 'react-native') {
                try {
                    // Set compileSdkVersion
                    if (!android.compileSdkVersion || android.compileSdkVersion == null) {
                        android.compileSdkVersion 34
                    }
                } catch (Exception e) {
                    // Ignore
                }
                
                try {
                    // Enable buildConfig
                    if (!android.buildFeatures.buildConfig) {
                        android.buildFeatures.buildConfig = true
                    }
                } catch (Exception e) {
                    try {
                        android.buildFeatures {
                            buildConfig = true
                        }
                    } catch (Exception e2) {
                        // Ignore
                    }
                }
            }
        }
    }
}