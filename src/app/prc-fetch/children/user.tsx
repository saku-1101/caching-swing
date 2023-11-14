"use client";

import handleUpdateUserName from "../actions/handleUpdateUserName";

export const Person = () => {
	return (
		<>
			<form action={handleUpdateUserName}>
				<label htmlFor="name">Enter your new name:</label>
				<br />
				<input
					type="text"
					name="name"
					style={{ padding: "2px", margin: "2px" }}
				/>
				<button type="submit" style={{ padding: "2px", margin: "2px" }}>
					Update Name
				</button>
			</form>
		</>
	);
};
