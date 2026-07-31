import type { PeerIdentity, RoomPeer } from '#server/utils/rooms';
import { eq } from 'drizzle-orm';
import { defineWebSocketHandler } from 'h3';
import { getAuth } from '#server/utils/auth';
import { getDb } from '#server/utils/db';
import { meetings } from '#server/utils/db/schema';
import { handleAction, joinRoom, leaveRoom, touchPresence } from '#server/utils/rooms';
import { ClientAction } from '#shared/utils/protocol';

/**
 * 多人会议 WebSocket 入口：升级阶段用 better-auth session 鉴权，
 * 连接身份写入 peer.context，动作交给 rooms 模块权威执行并广播。
 */
export default defineWebSocketHandler({
  async upgrade(request) {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session)
      return new Response('请先登录', { status: 401 });
    if (!session.user.emailVerified)
      return new Response('请先完成邮箱验证', { status: 403 });

    // /api/meetings/:id/ws
    const segments = new URL(request.url).pathname.split('/');
    const meetingId = Number.parseInt(segments[segments.length - 2] ?? '', 10);
    if (!Number.isInteger(meetingId))
      return new Response('会议不存在', { status: 404 });
    const [row] = await getDb().select({ id: meetings.id }).from(meetings).where(eq(meetings.id, meetingId));
    if (!row)
      return new Response('会议不存在', { status: 404 });

    request.context.meetingId = meetingId;
    request.context.userId = session.user.id;
    request.context.name = session.user.name || session.user.email;
  },

  async open(peer) {
    try {
      await joinRoom(peer as RoomPeer);
    } catch (err) {
      console.error('[ws] join failed', err);
      peer.close(1011, '加入会议失败');
    }
  },

  async message(peer, message) {
    let action: ClientAction;
    try {
      action = ClientAction.parse(JSON.parse(message.text()));
    } catch {
      peer.send(JSON.stringify({ type: 'error', message: '无效的操作消息' }));
      return;
    }
    try {
      if (action.action === 'ping') {
        // 心跳仅刷新 presence，不进入会议状态变更
        await touchPresence(peer as RoomPeer);
        return;
      }
      await handleAction(peer as RoomPeer, action);
    } catch (err) {
      console.error('[ws] action failed', err);
      peer.send(JSON.stringify({ type: 'error', message: '操作失败，请重试' }));
    }
  },

  async close(peer) {
    const { meetingId } = peer.context as unknown as PeerIdentity;
    if (!meetingId)
      return;
    try {
      await leaveRoom(peer as RoomPeer);
    } catch (err) {
      console.error('[ws] leave failed', err);
    }
  },
});
