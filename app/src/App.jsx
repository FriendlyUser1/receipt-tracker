import { Route, BrowserRouter as Router, Routes } from "react-router-dom";

import AddReceipt from "./pages/AddReceipt";

const App = () => {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<AddReceipt />} />
			</Routes>
		</Router>
	);
};

export default App;
