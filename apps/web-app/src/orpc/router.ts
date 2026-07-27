import {
	applyNodeShorthand,
	createNode,
	createTag,
	deleteNode,
	deleteTag,
	duplicateNode,
	getNode,
	getNodeAncestors,
	listNodes,
	listTags,
	moveNode,
	quickOpen,
	renameTag,
	resolveNodeSlug,
	restoreNode,
	setNodeDueDate,
	setNodeRecurrence,
	setNodeTags,
	setNodeType,
	setTaskCompleted,
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
	listSessions,
	revokeOtherSessions,
	revokeSession,
} from "@/features/sessions/server/session-procedures";
import {
	getSettings,
	updateSettings,
} from "@/features/settings/server/settings-procedures";
import {
	getTreeHistoryEntry,
	listTreeHistory,
	restoreTreeHistoryEntry,
} from "@/features/tree-history/server/tree-history-procedures";

export default {
	nodes: {
		applyShorthand: applyNodeShorthand,
		list: listNodes,
		get: getNode,
		resolveSlug: resolveNodeSlug,
		ancestors: getNodeAncestors,
		visibleTree,
		quickOpen,
		create: createNode,
		createTag,
		move: moveNode,
		toggleExpanded: toggleNodeExpanded,
		delete: deleteNode,
		restore: restoreNode,
		duplicate: duplicateNode,
		updateContent: updateNodeContent,
		setType: setNodeType,
		setDueDate: setNodeDueDate,
		setRecurrence: setNodeRecurrence,
		setTaskCompleted,
		setTags: setNodeTags,
		listTags,
		renameTag,
		deleteTag,
	},
	settings: {
		get: getSettings,
		update: updateSettings,
	},
	sessions: {
		list: listSessions,
		revoke: revokeSession,
		revokeOthers: revokeOtherSessions,
	},
	premium: {
		get: getPremiumStatus,
		requestSeat: requestPremiumSeat,
		revokeSeat: revokePremiumSeat,
	},
	treeHistory: {
		list: listTreeHistory,
		get: getTreeHistoryEntry,
		restore: restoreTreeHistoryEntry,
	},
};
