import { LoaderFunctionArgs, json } from '@remix-run/node';
import stream from 'stream';
import { promisify } from 'util';
const pipeline = promisify(stream.pipeline);
import fs from 'fs';
import readline from 'readline';
import db from '../db.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
   const fileUrl =
      'https://storage.googleapis.com/shopify-tiers-assets-prod-us-east1/bulk-operation-outputs/s6rrnbu4koat29k3xeqglfinszor-final?GoogleAccessId=assets-us-prod%40shopify-tiers.iam.gserviceaccount.com&Expires=1718020577&Signature=Wj0y%2BhhPSlz5uPLUGxVw4If0ZQqOPYd0AzLw9nFRtxb5l1OfD%2BU0cr9AF2FCYuRJgVo1bmW8HN4pb%2B%2F1i1aX9VAm5VKHqmFdao%2FIIJchJ17AdwneBTMyZmPEIKnhSB3xKC4kfeCnifvEju%2FKpNQCg42FpCDwQQtcdIBC9u7eobFZlFF%2BK4K1fwApBzgwiw4qkR4VmMIdks2LKyQC%2BPrMkjAKRaRDALRqGjz%2FpvpDDAkqRJ46S6vLCN%2FyaU%2F9RbTGPp16fQ7WXOPwfTzHxtexOIa1MvBbNzphR3JKeFFwLzBgQaDiMHfx35Em0c1%2FyXqyj2NBIUQcZRJZkkKr3eKg7g%3D%3D&response-content-disposition=attachment%3B+filename%3D%22bulk-4277455028528.jsonl%22%3B+filename%2A%3DUTF-8%27%27bulk-4277455028528.jsonl&response-content-type=application%2Fjsonl';
   const outputPath = 'path-to-local-file.jsonl';

};


