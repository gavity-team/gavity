import { defineEventHandler, toWebRequest } from 'h3';
import { getAuth } from '#server/utils/auth';

export default defineEventHandler(ev => getAuth().handler(toWebRequest(ev)));
