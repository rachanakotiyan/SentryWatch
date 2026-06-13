import { useState } from "react";
import AddAsset from "./pages/AddAsset";
import Dashboard from "./pages/Dashboard";
import { getAssets } from "./utils/storage";

function App() {
  const [assets, setAssets] = useState(getAssets());

  return (
    <div>
      <AddAsset
        assets={assets}
        setAssets={setAssets}
      />

      <hr />

      <Dashboard
  assets={assets}
  setAssets={setAssets}
/>
    </div>
  );
}

export default App;