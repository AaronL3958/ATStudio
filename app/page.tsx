import Home from './home';
import {getAppUser} from './account-auth';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getAppUser();return <Home initialUser={user?{name:user.name,email:user.email,kind:user.kind}:null}/>;}
