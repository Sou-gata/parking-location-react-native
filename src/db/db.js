import { open } from '@op-engineering/op-sqlite'

const db = open({
    name: 'SRTEC_GBT_Location.db',
});

export default db