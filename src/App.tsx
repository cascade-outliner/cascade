import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import reactLogo from "./assets/react.svg";
import "./App.css";

function App() {
	const [greetMsg, setGreetMsg] = useState("");
	const [name, setName] = useState("");

	async function greet() {
		setGreetMsg(await invoke("greet", { name }));
	}

	return (
		<main className="flex flex-col items-center justify-center min-h-screen px-4 font-sans bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
			<h1 className="text-3xl font-bold mb-6">Welcome to Tauri + React</h1>

			<div className="flex gap-6 mb-4">
				<a href="https://vite.dev" target="_blank" rel="noopener">
					<img
						src="/vite.svg"
						className="h-24 p-4 transition-[filter] duration-300 hover:drop-shadow-[0_0_2em_#747bff]"
						alt="Vite logo"
					/>
				</a>
				<a href="https://tauri.app" target="_blank" rel="noopener">
					<img
						src="/tauri.svg"
						className="h-24 p-4 transition-[filter] duration-300 hover:drop-shadow-[0_0_2em_#24c8db]"
						alt="Tauri logo"
					/>
				</a>
				<a href="https://react.dev" target="_blank" rel="noopener">
					<img
						src={reactLogo}
						className="h-24 p-4 transition-[filter] duration-300 hover:drop-shadow-[0_0_2em_#61dafb]"
						alt="React logo"
					/>
				</a>
			</div>

			<p className="mb-6 text-gray-600 dark:text-gray-400">
				Click on the Tauri, Vite, and React logos to learn more.
			</p>

			<form
				className="flex gap-2 mb-4"
				onSubmit={(e) => {
					e.preventDefault();
					greet();
				}}
			>
				<input
					onChange={(e) => setName(e.currentTarget.value)}
					placeholder="Enter a name..."
					className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 outline-none focus:border-indigo-500"
				/>
				<button
					type="submit"
					className="px-4 py-2 rounded-lg border border-transparent bg-white dark:bg-gray-800 font-medium shadow-sm cursor-pointer hover:border-blue-500 active:border-blue-600 active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
				>
					Greet
				</button>
			</form>

			<p className="text-gray-700 dark:text-gray-300">{greetMsg}</p>
		</main>
	);
}

export default App;
