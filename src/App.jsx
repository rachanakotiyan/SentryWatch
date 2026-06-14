import { useState } from "react";
import AddAsset from "./pages/AddAsset";
import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/Alerts";
import { getAssets } from "./utils/storage";
import { checkSSL } from "./services/sslService";

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

      <hr />

      <Alerts />
    </div>
  );
}

export default App;