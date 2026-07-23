import {
	createNode,
	deleteNode,
	deleteTag,
	duplicateNode,
	getNode,
	getNodeAncestors,
	listNodes,
	listTags,
	moveNode,
	resolveNodeSlug,
	restoreNode,
	setNodeDueDate,
	setNodeTags,
	setNodeType,
	toggleNodeExpanded,
	updateNodeContent,
	visibleTree,
} from "@/features/nodes/server/procedures";
import {
	getPremiumStatus,
	requestPremiumSeat,
	revokePremiumSeat,
} from "@/features/premium/server/premium-procedures";
import {
	getSettings,
	updateSettings,
} from "@/features/settings/server/settings-procedures";

export default {
	nodes: {
		list: listNodes,
		get: getNode,
		resolveSlug: resolveNodeSlug,
		ancestors: getNodeAncestors,
		visibleTree,
		create: createNode,
		move: moveNode,
		toggleExpanded: toggleNodeExpanded,
		delete: deleteNode,
		restore: restoreNode,
		duplicate: duplicateNode,
		updateContent: updateNodeContent,
		setType: setNodeType,
		setDueDate: setNodeDueDate,
		setTags: setNodeTags,
		listTags,
		deleteTag,
	},
	settings: {
		get: getSettings,
		update: updateSettings,
	},
	premium: {
		get: getPremiumStatus,
		requestSeat: requestPremiumSeat,
		revokeSeat: revokePremiumSeat,
	},
};
