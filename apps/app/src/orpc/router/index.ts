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
	setNodeDueDate,
	setNodeTags,
	setNodeType,
	toggleNodeExpanded,
	updateNodeContent,
	visibleTree,
} from "@/core/nodes/node.procedures";
import {
	getPremiumStatus,
	requestPremiumSeat,
} from "@/core/premium/premium.procedures";
import {
	getSettings,
	updateSettings,
} from "@/core/settings/settings.procedures";

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
	},
};
