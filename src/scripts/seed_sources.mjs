import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
  projectId: "ia-tools-v2-micnux",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const initialSources = [
    { name: "@googlegemma", platform: "X", handle: "googlegemma", active: true },
    { name: "@chromeunboxed", platform: "X", handle: "chromeunboxed", active: true },
    { name: "@googlecloud", platform: "X", handle: "googlecloud", active: true },
    { name: "@GoogleCloudTech", platform: "X", handle: "GoogleCloudTech", active: true },
    { name: "Google Cloud Tech", platform: "YouTube", handle: "@googlecloudtech", url: "https://www.youtube.com/@googlecloudtech", active: true },
    { name: "@OpenRouter", platform: "X", handle: "OpenRouter", active: true },
    { name: "@ChromiumDev", platform: "X", handle: "ChromiumDev", active: true },
    { name: "@GoogleWorkspace", platform: "X", handle: "GoogleWorkspace", active: true },
    { name: "@CloudflareDev", platform: "X", handle: "CloudflareDev", active: true },
    { name: "@NotebookLM", platform: "X", handle: "NotebookLM", active: true },
    { name: "@GoogleDeepMind", platform: "X", handle: "GoogleDeepMind", active: true }
];

async function seed() {
    console.log("Seeding sources to Firestore...");
    const sourcesCol = collection(db, "fuentes");
    for (const source of initialSources) {
        // Simple check to avoid duplicates during dev
        await addDoc(sourcesCol, {
            ...source,
            createdAt: new Date().toISOString()
        });
        console.log(`Added source: ${source.name}`);
    }
}

seed().catch(err => {
    console.error("Error seeding sources:", err);
    process.exit(1);
});
