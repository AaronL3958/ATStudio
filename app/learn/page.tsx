import Studio from '../studio';
import {getAppUser} from '../account-auth';
export const metadata={title:'Learn · Beta — ATStudio'};
export const dynamic='force-dynamic';
export default async function Page(){const user=await getAppUser();return <Studio initialView='learn' user={user?{name:user.name,email:user.email,kind:user.kind}:null}/>;}
